// ---------------------------------------------------------------------------
//     .  _|_           ▄▀▀                  ▀                      .   o   //
//   .     |    ▄▄▄▄  ▄▄█▄▄  ▄   ▄  ▄▄▄▄   ▄▄▄    ▄▄▄▄    ▄▄▄          / \  //
//             █▀ ▀█    █     █▄█   █▀ ▀█    █    █▀ ▀█  █▀  █   .     \ /  //
//    o    :   █   █    █     ▄█▄   █   █    █    █   █  █▀▀▀▀          o   //
//   / \       ▀█▄▀█    █    ▄▀ ▀▄  ██▄█▀  ▄▄█▄▄  ██▄█▀  ▀█▄▄▀              //
//   \ /  .     ▄  █                █             █               _|_     . //
//    o          ▀▀        `        ▀             ▀       .        |        //
// ---------------------------------------------------------------------------
// LICENSE: CC0 1.0 Universal
// ---------------------------------------------------------------------------
// See docs at https://github.com/pp19dd/gfxpipe/
// ---------------------------------------------------------------------------
// this program connects to an arduino via serial connection (COM port)
// and sends it paint instructions for the Adafruit_GFX library
// ---------------------------------------------------------------------------
// required: the arduino should be first flashed with gfxpipe.ino firmware,
// and config.h customized for your actual display hardware
// ---------------------------------------------------------------------------
// there are 2 modes of operation for you to use this program:
//
//    interactive javascript mode     | file monitoring mode --file=draw.txt
//                                    | 
// pull up http://localhost:8080/ and | use whichever programming language
// use the interactive editor in your | you're comfortable with to construct
// web browser, writing code in       | paint instructions and save them to a
// javascript.  this program will     | text file.  this program will watch
// transmit the paint instructions    | for changes and transmit them
// ---------------------------------------------------------------------------
// the paint instructions are in plain text and can be entered manually
// in arduino IDE's serial monitor
// ---------------------------------------------------------------------------
// this program must be able to reach the arduino via COM port. common issues:
// - if using WSL/WSL2, switch to a command prompt instead
// - if port is unavailable, exit arduino ide's terminal monitor
// - make sure BAUD rate is same for this server and arduino's firmware
// ---------------------------------------------------------------------------

const { SerialPort } = require( "serialport" );
const fs =             require( "fs" );
const http =           require( "http" );
const vm =             require( "vm" );

// can be overriden with command line arguments
const config = { file: null, port: 'COM1', listen: 8080, baud: 115200 };

let queue = [];
let isProcessing = false;
let count_sent = 0;
let bytes_sent = 0;
let ack_check = false;
let needs_newline = false;
let status = {};

get_self_header_lines(0, 9).forEach( (line) => {
    console.log("\x1b[34m" + line.substring(0) + "\x1b[0m");
});

function displayLog(subsystem, message) {
    displayMsg("I", "90", subsystem, message);
}

function displayWarning(subsystem, message) {
    displayMsg("W", "33", subsystem, message);
}

function displayError(subsystem, message) {
    displayMsg("E", "31", subsystem, message);
}

function displayMsg(letter, color, subsystem, message) {
    if( needs_newline ) console.log("\n");
    const spaces = " ".repeat(subsystem.length+6);
    const idented_message = message.toString().replaceAll("\n", "\n" + spaces);
    console.warn(
        `\x1b[${color}m[${letter}] ${subsystem}:\x1b[0m ${idented_message}`
    );
    needs_newline = false;
}

process.argv.forEach(val => {
    if( val.startsWith('--file=') ) config.file = val.split('=')[1].trim();
    if( val.startsWith('--port=') ) config.port = val.split('=')[1].trim();
    if( val.startsWith('--listen=') ) config.listen = parseInt(val.split('=')[1]);
    if( val.startsWith('--baud=') ) config.baud = parseInt(val.split('=')[1]);
});

if( config.file !== null ) {
    if( !fs.existsSync(config.file) ) {
        console.error("");
        displayError("filesystem", `file does not exist: ${config.file}\n`);
        process.exit();
    }
}

status.config = config;
let config_hint = "server starting with this config:\n";
for( k in config ) {
    config_hint += `--${k}=${config[k]}\n`;
}
displayLog("gfxpipe", config_hint );

if( config.file === null ) {
    displayLog( "gfxpipe",
        "running in interactive mode. if you want the file monitoring " +
        "mode instead,\nuse the --file=drawing1.txt parameter\n"
    );
} else {
    displayLog( "gfxpipe",
        "running in file monitoring mode. if you want the interactive " +
        "mode instead,\nleave out the --file parameter.\n"
    );
}
displayLog( "gfxpipe", "CTRL + C to exit\n");

function send_file(res, content_type, path) {
    res.writeHead(200, {
        "Content-Type": `${content_type}; charset=utf-8`,
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        "Pragma": "no-cache",
        "Expires": "0"
    });

    res.end(fs.readFileSync(path));
    displayLog("webserver", `${path} sent ${content_type}` );
}

const server = http.createServer((req, res) => {
    if( req.method === "GET" && req.url === "/") {
        send_file(res, "text/html", "./editor.html");
    } else if( req.method === "GET" && req.url === "/editor.css") {
        send_file(res, "text/css", "./editor.css");
    } else if( req.method === "GET" && req.url === "/editor.js") {
        send_file(res, "text/javascript", "./editor.js");
    } else if( req.method === "POST" && req.url === "/update") {
        let body = "";

        // collect data chunks
        req.on("data", chunk => {
            body += chunk.toString();
        });

        // send encoded lines to arduino
        req.on("end", () => {
            const error = run_user_code(body);
            if( error ) {
                res.writeHead(400, { "Content-Type": "application/json" });
                res.end( JSON.stringify(error) );
            } else {
                res.writeHead(200);
                res.end( JSON.stringify(status) );
            }
        });
    } else {
        res.writeHead(404, { "Content-Type": "text/html" });
        res.end( "404: file not found?" );
        displayWarning("webserver", "requested file not found" );
    }
});

function get_self_header_lines(start, num) {
    const src = fs.readFileSync( __filename, "utf8" );
    const lines = src.split( /\r?\n/ );
    return( lines.slice( start, start + num ) );
}

// RGB (0-255) to RGB565 integer
function helper_color(r, g, b) {
    r = Math.max(0, Math.min(255, Math.floor(r)));
    g = Math.max(0, Math.min(255, Math.floor(g)));
    b = Math.max(0, Math.min(255, Math.floor(b)));

    // 5 bits red, 6 bits green, 5 bits blue
    const r5 = (r >> 3) & 0x1F;
    const g6 = (g >> 2) & 0x3F;
    const b5 = (b >> 3) & 0x1F;

    return (r5 << 11) | (g6 << 5) | b5;
}

// RGB (0-255) -> HSV: h in [0,360), s,v in [0,1]
function helper_rgb_to_hsv(r, g, b) {
    r /= 255.0; g /= 255.0; b /= 255.0;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const delta = max - min;

    let h = 0.0;
    if (delta !== 0.0) {
        if (max === r) {
            h = 60.0 * (((g - b) / delta) % 6);
        } else if (max === g) {
            h = 60.0 * (((b - r) / delta) + 2.0);
        } else {
            h = 60.0 * (((r - g) / delta) + 4.0);
        }
    }
    if (h < 0.0) h += 360.0;

    const s = (max === 0.0) ? 0.0 : (delta / max);
    const v = max;

    return( [h, s, v] );
}

// HSV -> RGB (0-255 ints). h in [0,360), s,v in [0,1]
function helper_hsv_to_rgb(h, s, v) {
    // JavaScript % can return negative, so we normalize h
    h = h % 360.0;
    if (h < 0.0) h += 360.0;

    const c = v * s;
    const x = c * (1.0 - Math.abs(((h / 60.0) % 2.0) - 1.0));
    const m = v - c;

    let rp = 0.0, gp = 0.0, bp = 0.0;

    if (h < 60.0) { rp = c; gp = x; bp = 0.0; }
    else if (h < 120.0) { rp = x; gp = c; bp = 0.0; }
    else if (h < 180.0) { rp = 0.0; gp = c; bp = x; }
    else if (h < 240.0) { rp = 0.0; gp = x; bp = c; }
    else if (h < 300.0) { rp = x; gp = 0.0; bp = c; }
    else { rp = c; gp = 0.0; bp = x; }

    let r = Math.max(0, Math.min(255, Math.round((rp + m) * 255.0)));
    let g = Math.max(0, Math.min(255, Math.round((gp + m) * 255.0)));
    let b = Math.max(0, Math.min(255, Math.round((bp + m) * 255.0)));

    return( [r, g, b] );
}

// HSV-based morph between two colors
function helper_color_at(c1, c2, current, max) {
    let [r1, g1, b1] = c1;
    let [r2, g2, b2] = c2;

    current = Math.floor(current);
    max = Math.floor(max);

    if (max <= 0) return helper_color(r2, g2, b2);

    if (current < 0) current = 0;
    if (current > max) current = max;

    const t = current / max;

    const [h1, s1, v1] = helper_rgb_to_hsv(r1, g1, b1);
    const [h2, s2, v2] = helper_rgb_to_hsv(r2, g2, b2);

    // Interpolate hue the short way around the circle
    let dh = h2 - h1;
    if (dh > 180.0) {
        dh -= 360.0;
    } else if (dh < -180.0) {
        dh += 360.0;
    }

    const h = h1 + dh * t;
    let s = s1 + (s2 - s1) * t;
    let v = v1 + (v2 - v1) * t;

    // Clamp s,v
    s = Math.max(0.0, Math.min(1.0, s));
    v = Math.max(0.0, Math.min(1.0, v));

    const [r, g, b] = helper_hsv_to_rgb(h, s, v);
    return( helper_color(r, g, b) );
}

function run_user_code(code) {
    let output = "";
    let errorDetail = null;

    // 1. define our "sandbox" with commands available to user
    const sandbox = {
        console: {
            log: (...args) => console.log('[User Log]:', ...args),
            info: (...args) => console.info('[User Info]:', ...args),
            error: (...args) => console.error('[User Error]:', ...args),
        },
        radians: (deg) => { return(deg * (Math.PI/180)); },
        degrees: (rad) => { return(rad * (180/Math.PI)); },
        fillScreen: (color) => {
            color = Math.round(color);
            output += `S,${color}\n`;
        },
        drawLine: (...args) => {
            const [x1, y1, x2, y2, color] = args.map(Math.round);
            output += `L,${x1},${y1},${x2},${y2},${color}\n`;
        },
        drawPixel: (...args) => {
            const [ x, y, color ] = args.map(Math.round);
            output += `P,${x},${y},${color}\n`;
        },
        drawRect: (...args) => {
            const [ x, y, w, h, color ] = args.map(Math.round);
            output += `r,${x},${y},${w},${h},${color}\n`;
        },
        fillRect: (...args) => {
            const [ x, y, w, h, color ] = args.map(Math.round);
            output += `R,${x},${y},${w},${h},${color}\n`;
        },
        drawCircle: (...args) => {
            const [ x, y, r, color ] = args.map(Math.round);
            output += `c,${x},${y},${r},${color}\n`;
        },
        fillCircle: (...args) => {
            const [ x, y, r, color ] = args.map(Math.round);
            output += `C,${x},${y},${r},${color}\n`;
        },
        drawEllipse: (...args) => {
            const [ x, y, w, h, color ] = args.map(Math.round);
            output += `e,${x},${y},${w},${h},${color}\n`;
        },
        fillEllipse: (...args) => {
            const [ x, y, w, h, color ] = args.map(Math.round);
            output += `E,${x},${y},${w},${h},${color}\n`;
        },
        drawRoundRect: (...args) => {
            const [ x, y, w, h, r, color ] = args.map(Math.round);
            output += `q,${x},${y},${w},${h},${r},${color}\n`;
        },
        fillRoundRect: (...args) => {
            const [ x, y, w, h, r, color ] = args.map(Math.round);
            output += `Q,${x},${y},${w},${h},${r},${color}\n`;
        },
        drawTriangle: (...args) => {
            const [ x1, y1, x2, y2, x3, y3, color ] = args.map(Math.round);
            output += `t,${x1},${y1},${x2},${y2},${x3},${y3},${color}\n`;
        },
        fillTriangle: (...args) => {
            const [ x1, y1, x2, y2, x3, y3, color ] = args.map(Math.round);
            output += `T,${x1},${y1},${x2},${y2},${x3},${y3},${color}\n`;
        },
        setRate: (ms) => {
            ms = Math.round(ms);
            output += `Z,${ms}\n`;
        },
        setFont: (...args) => {
            const [ font_index, font_size, color ] = args.map(Math.round);
            output += `F,${font_index},${font_size},${color}\n`;
        },
        print: (x, y, text) => {
            x = Math.round(x);
            y = Math.round(y);
            output += `W,${x},${y},${text}\n`;
        },
        rgb: (...args) => {
            const [ r, g, b ] = args.map(Math.round);
            // convert RGB888 to RGB565 for Adafruit_GFX
            // return( (r & 0xF8) << 8) | ((g & 0xFC) << 3) | (b >> 3);
            return( helper_color(r, g, b) );
        },
        colorAt: (...args) => {
            args[0].map(Math.round);
            args[1].map(Math.round);
            const c = Math.round(args[2]);
            const t = Math.round(args[3]);

            // const [r1, g1, b1, r2, g2, b2, c, t] = args.map(Math.round);
            return( helper_color_at(args[0],args[1],c,t) );
        }
    };

    try {

        // 2. run user's code in a sandbox
        vm.createContext( sandbox );
        vm.runInContext( code, sandbox, {
            timeout: 100,
            displayErrors: true,
            lineOffset: 0
        });
    } catch (err) {
        // todo: handle err.code === 'ERR_SCRIPT_EXECUTION_TIMEOUT' separately?
        const lineMatch = err.stack.match(/evalmachine\.<anonymous>:(\d+)/);
        const line = lineMatch ? parseInt(lineMatch[1], 10) : null;

        errorDetail = {
            message: err.message,
            line: line
        };

        process.stdout.write(`\x1b[31mERR:L${errorDetail.line}\x1b[0m `);
        needs_newline = true;
    } finally {
        // add new commands to the end
        if( output.length > 0 ) {
            const lines = output.split('\n').filter(l => l.trim().length > 0);
            queue.push(...lines);
            
            // kickstart serial loop if idle
            if( !isProcessing ) {
                sendNext();
            }
        }
    }
    return( errorDetail );
}

if( config.file === null ) {
    server.listen(config.listen, () => {
        displayLog("gfxpipe",
            `interactive editor available at http://localhost:${config.listen}\n`
        );
    });
    server.on("error", (e) => {
        displayError("http server", e);
        process.exit();
    });
}

const port = new SerialPort({
    path: config.port,
    baudRate: config.baud
});

// send the next line in the data queue
async function sendNext() {
    if( queue.length === 0 ) {
        isProcessing = false;
        return;
    }
    isProcessing = true;
    const line = queue.shift();
    port.write(line + '\n');
    count_sent++;
    bytes_sent += (line.length + 1);
}

port.on("error", (err) => {
    displayError("serialport", err);
    process.exit();
});

// raw port listener
port.on("data", (data) => {
    const char = data.toString();

    // ack dot detected, trigger next line
    if( char.includes('.') ) {
        ack_check = true;
        sendNext();
    }
});

function pipeFileToSerial() {
    const data = fs.readFileSync(config.file, "utf8");
    const lines = data.split(/\r?\n/).filter(l => l.trim().length > 0);

    queue.push(...lines);

    // Start the chain
    if (!isProcessing) {
        sendNext();
    }
}

// ---------------------------------------------------------------------------
// watch mode
// ---------------------------------------------------------------------------
if( config.file !== null ) {
    fs.watch(config.file, (event) => {
        if( event === "change" ) {
            pipeFileToSerial();
        }
    });
}

// ---------------------------------------------------------------------------
// connection to COM port does not mean it's the right one
// ---------------------------------------------------------------------------
setTimeout( () => {
    if( ack_check === false ) {
        displayWarning("gfxpipe",
            "hmm, suspicious: have not received a keepalive message from the arduino\n"+
            "check the connection? is the arduino flashed with gfxpipe.ino firmware?\n" +
            "arduino IDE's serial monitor should show \".\" messages every 5-10 seconds\n"
        );
    }
}, 15000);

// ---------------------------------------------------------------------------
// periodically display how many bytes have been sent
// ---------------------------------------------------------------------------
setInterval( () => {
    if( count_sent > 0 ) {
        // console.info( "sent:", count_sent);
        // process.stdout.write("+" + count_sent + " ");
        process.stdout.write("+" + bytes_sent + " ");
        needs_newline = true;
        count_sent = 0;
        bytes_sent = 0;
    }
}, 1000);

