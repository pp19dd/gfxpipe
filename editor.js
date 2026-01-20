// ---------------------------------------------------------------------------
//     .  _|_           ▄▀▀                  ▀                      .   o   //
//   .     |    ▄▄▄▄  ▄▄█▄▄  ▄   ▄  ▄▄▄▄   ▄▄▄    ▄▄▄▄    ▄▄▄          / \  //
//             █▀ ▀█    █     █▄█   █▀ ▀█    █    █▀ ▀█  █▀  █   .     \ /  //
//    o    :   █   █    █     ▄█▄   █   █    █    █   █  █▀▀▀▀          o   //
//   / \       ▀█▄▀█    █    ▄▀ ▀▄  ██▄█▀  ▄▄█▄▄  ██▄█▀  ▀█▄▄▀              //
//   \ /  .     ▄  █                █             █               _|_     . //
//    o          ▀▀        `        ▀             ▀       .        |        //
// ---------------------------------------------------------------------------
// LICENSE: CC0, so not really licensed
// ---------------------------------------------------------------------------
// See docs at https://github.com/pp19dd/gfxpipe/
// ---------------------------------------------------------------------------

// toggles detail level: < less | more >
let help_level = 1;

function apply_help_level() {
    const div_help = document.querySelector("#help-instructions");
    for( let i = 0; i <= 3; i++ ) {
        div_help.classList.remove(`help-level-${i}`);
    }
    div_help.classList.add(`help-level-${help_level}`);
    
    editor.layout();
    editor.focus();

    document.querySelector("#help-level-indicator").innerHTML = "H" + help_level;
}

function toggle_help() {
    help_level++;
    if( help_level > 3 ) help_level = 0;
    apply_help_level();
}

function setup_help() {

    const help = [
        {
            category: "addon", command: "console.info", parameters: "(\"text\")",
            description: "displays custom log messages on node server"
        },{
            category: "addon", command: "setRate", parameters: "miliseconds",
            description: "sets how frequently arduino draws the screen"
        },{
            category: "addon", command: "rgb", parameters: "r, g, b",
            description: "convert R,G,B to 16-bit 5-6-5 color"
        },{
            category: "addon", command: "colorAt", parameters: "[r, g, b], [r, g, b], current, total",
            description: "interpolates color gradient between two colors, at current/total position"
        },{
            category: "addon", command: "radians", parameters: "deg",
            description: "converts degrees to radians"
        },{
            category: "addon", command: "degrees", parameters: "rad",
            description: "converts radians to degrees"
        },{
            command: "fillScreen", parameters: "color"
        },{
            command: "drawPixel", parameters: "x, y, color"
        },{
            command: "drawLine", parameters: "x1, y1, x2, y2, color"
        },{
            command: "drawRect", parameters: "x, y, w, h, color"
        },{
            command: "fillRect", parameters: "x, y, w, h, color"
        },{
            command: "drawCircle", parameters: "x, y, r, color"
        },{
            command: "fillCircle", parameters: "x, y, r, color"
        },{
            command: "drawEllipse", parameters: "x, y, w, h, color"
        },{
            command: "fillEllipse", parameters: "x, y, w, h, color"
        },{
            command: "drawRoundRect", parameters: "x, y, w, h, r, color"
        },{
            command: "fillRoundRect", parameters: "x, y, w, h, r, color"
        },{
            command: "drawTriangle", parameters: "x1, y1, x2, y2, x3, y3, color"
        },{
            command: "fillTriangle", parameters: "x1, y1, x2, y2, x3, y3, color"
        },{
            command: "setFont", category: "addon", parameters: "index, size, color",
            description: "picks indexed font (configured in config.h), sets size and color all at once"
        },{
            command: "print", category: "addon", parameters: "x, y, text",
            description: "setCursor() and print() all at once"
        }
    ];

    // logo is borrowed from the comment block
    const logo = document.childNodes[0].textContent.split("\n");
    let logo_trimmed = "";
    for( let i = 2; i < 9; i++ ) {
        logo_trimmed += logo[i].substring(16,77).trimEnd() + "\n";
    }
    document.querySelector("pre a").innerHTML = logo_trimmed;

    // i like a command overview so there's no guesswork
    const div_grid = document.querySelector("#command-grid");

    function add_instruction(e) {
        const div_instruction = document.createElement("div");
        div_instruction.classList.add("instruction");
        div_instruction.innerHTML = e.command;
        const div_parameters = document.createElement("span");
        div_parameters.classList.add("parameters");
        div_parameters.innerHTML = " (" + e.parameters + ")";
        div_instruction.appendChild(div_parameters);

        if( e.description ) {
            const div_description = document.createElement("div");
            div_description.classList.add("description");
            div_description.innerHTML = e.description;
            div_instruction.appendChild(div_description);
        }

        if( e.category) {
            div_instruction.classList.add(e.category);
        }
        div_grid.appendChild(div_instruction);
    }

    for( i = 0; i < help.length; i++ ) {
        add_instruction( help[i] );
    }
}

let editor;
let debounceTimer;
setup_help();

require.config({
    paths: {
        'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs'
    }
});

require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.querySelector("#editorContainer"), {
        value:
`
// this program executes on the node.js server as you type
fillScreen(0);
let d = 100;

run = 360;
for( let a = 0; a < run; a += 15) {
    x = 120 + (d * Math.sin( radians(-a) ));
    y = 120 + (d * Math.cos( radians(-a) ));
    c = colorAt([40,0,0], [0, 64, 255], a, run);
    fillCircle(x, y, 10, c);
}

`,
        language: 'javascript',
        theme: 'vs-dark',
        automaticLayout: true,
        minimap: { enabled: true },
        quickSuggestions: false,
        suggestOnTriggerCharacters: false,
        parameterHints: { enabled: false },
        wordBasedSuggestions: false,
        snippetSuggestions: 'none'
    });
    
    editor.onDidChangeModelContent(() => {
        const isAuto = document.getElementById('autoExec').checked;
        if( isAuto ) {
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(sendCode, 100);
        }
    });

    // ctrl + enter executes
    editor.addAction({
        id: 'push-to-arduino',
        label: 'Push to Arduino',
        keybindings: [
            monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter
        ],
        run: function(ed) {
            sendCode();
            return( null );
        }
    });

    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.F1, () => {
        toggle_help();
    });

    editor.focus();
});

window.addEventListener("keydown", (e) => {
    if( e.key === "F1" ) {
        e.preventDefault();

        if( (e.ctrlKey || e.metaKey) && e.key === "F1" ) {
            toggle_help();
        } else {
            open_command_palette();
        }
    }
});

function open_command_palette() {
    editor.focus();
    editor.trigger("anyStringSource", "editor.action.quickCommand");
}

async function getStatus() {
    const response = await fetch('/status', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: code
    });
}

async function sendCode() {
    const code = editor.getValue();

    const response = await fetch('/update', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: code
    });

    monaco.editor.setModelMarkers(editor.getModel(), 'owner', []);
    if( response.status === 400 ) {
        const err = await response.json();
        
        // highlight error code
        monaco.editor.setModelMarkers(editor.getModel(), 'owner', [{
            startLineNumber: err.line,
            startColumn: 1,
            endLineNumber: err.line,
            endColumn: 1000,
            message: err.message,
            severity: monaco.MarkerSeverity.Error
        }]);

        document.querySelector("#status").innerHTML = `Error on line ${err.line}`;
    } else {
        document.querySelector("#status").innerHTML = "";
    }
}

function new_file() {
    if( confirm("Clear current code?" )) {
        editor.setValue("// new gfxpipe script\nfillScreen(0);\n");
    }
}

function sanitizeFilename(name) {
    // Remove: \ / : * ? " < > | and null bytes
    // Also trim leading/trailing spaces and dots
    return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function download_code() {
    const code = editor.getValue();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = 'drawing1.txt';
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

const filenameSpan = document.querySelector("#filename");

// cleanup 1/2
filenameSpan.addEventListener("keydown", (e) => {
    if( e.key === "Enter" ) {
        e.preventDefault();
        filenameSpan.blur();
    }
});

// cleanup 2/2
filenameSpan.addEventListener("input", () => {
    if( filenameSpan.innerText.includes("\n") ) {
        filenameSpan.innerText = filenameSpan.innerText.replace(/\r?\n|\r/g, "");
    }
});

// blur = contentEditable change event?
filenameSpan.addEventListener("blur", () => {
    let currentName = filenameSpan.innerText;
    let cleanName = sanitizeFilename(currentName);
    
    // default filename
    if( cleanName === "" ) {
        cleanName = "untitled-01.txt";
    }
    
    filenameSpan.innerText = cleanName;
    document.querySelector("#download").innerHTML = `download ${cleanName}`;
});
