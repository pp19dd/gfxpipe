// ---------------------------------------------------------------------------
//     .  _|_           ▄▀▀                  ▀                      .   o   //
//   .     |    ▄▄▄▄  ▄▄█▄▄  ▄   ▄  ▄▄▄▄   ▄▄▄    ▄▄▄▄    ▄▄▄          / \  //
//             █▀ ▀█    █     █▄█   █▀ ▀█    █    █▀ ▀█  █▀  █   .     \ /  //
//    o    :   █   █    █     ▄█▄   █   █    █    █   █  █▀▀▀▀          o   //
//   / \       ▀█▄▀█    █    ▄▀ ▀▄  ██▄█▀  ▄▄█▄▄  ██▄█▀  ▀█▄▄▀              //
//   \ /  .     ▄  █                █             █               _|_     . //
//    o          ▀▀        `        ▀             ▀       .        |        //
// ---------------------------------------------------------------------------
// LICENSE: CC0 1.0 Universal                                               //
// ---------------------------------------------------------------------------
// See docs at https://github.com/pp19dd/gfxpipe/                           //
// ---------------------------------------------------------------------------

let help_level = 2;     // toggles detail level: < less | more >
let file_num = 0;       // untitled_33.txt

let editor;
let debounceTimer;
const div_filename = document.querySelector("#filename");
const new_file_template = `// new gfxpipe script
fillScreen(0);

`;
// code as you type, in case of a browser refresh
let sticky_code = new_file_template;


function apply_help_level() {
    const div_help = document.querySelector("#help-instructions");
    for( let i = 0; i <= 3; i++ ) {
        div_help.classList.remove(`help-level-${i}`);
    }
    div_help.classList.add(`help-level-${help_level}`);
    
    editor.layout();
    editor.focus();

    document.querySelectorAll("#help-level-indicator circle").forEach( (circle, index) => {
        circle.classList.remove("filled" );
        if( (index + 1) <= help_level ) {
            circle.classList.add("filled" );
        }
    });
}

function toggle_help() {
    help_level++;
    if( help_level > 3 ) help_level = 0;
    store_settings();
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
    document.querySelector("pre.logo-small a").innerHTML = logo_trimmed;

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

require.config({
    paths: {
        'vs': 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.43.0/min/vs'
    }
});

require(['vs/editor/editor.main'], function() {
    editor = monaco.editor.create(document.querySelector("#editorContainer"), {
        // value: new_file_template,
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
        sticky_code = editor.getValue();
        store_settings();
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

    initialize_routines();

    editor.focus();
});

function setup_file_naming_events() {

    // cleanup 1/2
    div_filename.addEventListener("keydown", (e) => {
        if( e.key === "Enter" ) {
            e.preventDefault();
            div_filename.blur();
        }
    });

    // cleanup 2/2
    div_filename.addEventListener("input", () => {
        if( div_filename.innerText.includes("\n") ) {
            div_filename.innerText = div_filename.innerText.replace(/\r?\n|\r/g, "");
        }
    });

    div_filename.addEventListener("blur", () => {
        update_download_filename();
    });

}

function store_settings() {
    localStorage.setItem("gfxpipe-settings",
        JSON.stringify({
            "help_level": help_level,
            "file_num": file_num,
            "filename": div_filename.innerHTML,
            "sticky_code": sticky_code,
        })
    );
}

function load_settings() {
    const settings_string = localStorage.getItem("gfxpipe-settings");
    if( settings_string === null ) return;

    
    const settings = JSON.parse(settings_string);

    if( typeof settings["help_level"] !== "undefined") help_level = settings["help_level"];
    if( typeof settings["file_num"] !== "undefined") file_num = settings["file_num"];
    if( typeof settings["filename"] !== "undefined" ) div_filename.innerHTML = settings["filename"];
    if( typeof settings["sticky_code"] !== "undefined" ) sticky_code = settings["sticky_code"];
}

function initialize_routines() {
    setup_help();
    load_code_setup();
    load_settings();
    editor.setValue(sticky_code);
    update_download_filename();
    apply_help_level();
    setup_file_naming_events();
}

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

        document.querySelector(".bottom-part-2").classList.add("funny");
        document.querySelector("#status").innerHTML = `Error on line ${err.line}`;
    } else {
        const status = await response.json();
        
        document.querySelector(".bottom-part-2").classList.remove("funny");
        document.querySelector("#status").innerHTML = "";
        document.querySelector("#connection_status").innerHTML = 
            `Port: ${status.config.port} Baud: ${status.config.baud}`;
        
    }
}

function new_file() {
    if( confirm("Clear current code?" )) {
        editor.setValue(new_file_template);
        file_num++;
        div_filename.innerHTML = "";
        update_download_filename();
        store_settings();
    }
}

function sanitize_filename(name) {
    // Remove: \ / : * ? " < > | and null bytes
    // Also trim leading/trailing spaces and dots
    return name.replace(/[\\/:*?"<>|]/g, "").trim();
}

function save_code() {
    const code = editor.getValue();
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    
    a.href = url;
    a.download = div_filename.innerHTML.trim();
    document.body.appendChild(a);
    a.click();
    
    setTimeout(() => {
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }, 0);
}

function load_code_setup() {
    const input = document.getElementById("file_input");

    input.onchange = () => {
        const file = input.files[0];
        
        div_filename.innerHTML = file.name;
        update_download_filename();
        store_settings();

        if( !file ) {
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            editor.setValue(e.target.result);
            store_settings();
        };
        reader.readAsText(file);

        // reset so selecting the same file twice still triggers change
        input.value = "";
    };
}


// blur = contentEditable change event?
function update_download_filename() {
    let currentName = div_filename.innerText;
    let clean_name = sanitize_filename(currentName);
    
    // default filename
    if( clean_name === "" ) {
        clean_name = "untitled-" + file_num.toString().padStart(2, "0") + ".txt";
    }
    
    // enforce that it ends with .txt
    const suffix = clean_name.slice(-4).toLowerCase();
    if( suffix !== ".txt" ) {
        clean_name += ".txt";
    }

    div_filename.innerText = clean_name;
    document.querySelector("#download").innerHTML = `download ${clean_name}`;
}
