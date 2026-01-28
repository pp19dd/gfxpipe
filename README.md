**gfxpipe** is a lightweight Adafruit_GFX command-streaming pipeline for driving embedded displays supported by the **Adafruit_GFX** library.

Purpose of the program is to bypass recompiling firmware and let you prototype your own UI faster using the standard Adafruit_GFX commands.  See that 1 pixel adjustment before your coffee turns cold.

### How it works:

1. Arduino firmware (**gfxpipe.ino**): Arduino listens for draw instructions (as defined in Adafruit_GFX) and paints them
2. Node.js server (**server.js**): connects to Arduino via serial port, compiles and/or transmits encoded draw instructions to Arduino using rudimentary flow-control
3. Interactive editor (**localhost website**): lets you write JavaScript in a web browser IDE (monaco-powered) to draw using standard Adafruit_GFX commands in realtime

The starter kit offers an interactive editor in JavaScript but how you prototype your graphics is up to you.  Generate the Arduino graphics using whatever programming language you're most comfortable with and when you're done, you'll ultimately translate them to C/C++ for your Arduino project.

### Required:
- Programming language you're comfortable with (for programmatically generating your UI)
- node.js (for streaming the generated UI to the Arduino)
- Adafruit_GFX.h
- some kind of a working Arduino (or compatible) with a working display. 

### Getting Started:

- Edit gfxpipe/config.h
  - Configure it with your display
  - Configure any fonts you'll be using
- Test your code
  - Flash your Arduino with gfxpipe/gfxpipe.ino
  - Compile + upload
  - Make sure displaytest works upon boot
  - Open serial monitor and try sending some raw commands:
    - C,255
- Close serial monitor to make the COM port available
- Run npm install
- Run node server.js [COM PORT] [BAUD RATE] [FILE.txt]
- Pull up http://localhost:8080/
- Type to execute JavaScript code and to stream graphics commands interactively

### Server command line options:

By default, the node.js server starts in interactive mode where you write JavaScript code that mimic Adafruit_GFX functions. Those functions get rewritten to encoded instructions (see below) and are transmitted to the Arduino via serial port.  If you'd like to use a different programming language, you can set the server in watch mode where it will transmit a file when it detects changes.

* node server.js --file=drawing3.txt (optional, specifying file sets operating mode)
* node server.js --port=COM3
* node server.js --listen=8080
* node server.js --baud=115200


### Commands available to JavaScript:

JavaScript instructions are executed in node.js's vm upon keystroke / code change.

#### Helper additions:
* **console.info**("text") - Output to the server console, also supports log and error.
* **rgb** (r, g, b) - Converts R,G,B to 16-bit 5-6-5 color.
* **colorAt** ([r, g, b], [r, g, b], current, total) - Interpolates a gradient between two colors at current/total position for a smooth gradual transition.
* **radians** (deg) and degrees (rad) - Trigonometry helpers.

#### Wrapper for Adafruit_GFX functions:

Supports all standard primitives: `fillScreen`, `drawPixel`, `drawLine`, `drawRect`, `fillRect`, `drawCircle`, `fillCircle`, `drawEllipse`, `fillEllipse`, `drawRoundRect`, `fillRoundRect`, `drawTriangle`, `fillTriangle`.

#### System Commands:
* **setRate** (miliseconds) - sets how frequently the arduino flushes the canvas to the display.
* **setFont** (index, size, color) - picks a font (indexed in config.h) and sets properties in one call
* **print** (x, y, text) - set position and print() in one call



### Commands/Encoding:

This protocol is not super clever or efficient, but it works and is human-readable.  Colors are uint16_t integers, raw values used by the Adafruit_GFX library.  These commands can be sent via serial port connection or serial port monitor in the Arduino IDE:

| instruction | command        | parameters                    | example              |
| ----------- | -------------- | ----------------------------- | -------------------- |
| S           | fillScreen     | color                         | S,0                  |
| L           | drawLine       | x1, y1, x2, y2, color         | L,0,0,240,240,255    |
| P           | drawPixel      | x, y, color                   | P,30,30,255          |
| r           | drawRect       | x, y, w, h, color             | r,10,10,20,10,255    |
| R           | fillRect       | x, y, w, h, color             | R,10,10,20,10,255    |
| c           | drawCircle     | x, y, r, color                | c,30,30,10,255       |
| C           | fillCircle     | x, y, r, color                | C,30,30,10,255       |
| e           | drawEllipse    | x, y, w, h, color             | e,30,30,10,20,255    |
| E           | fillEllipse    | x, y, w, h, color             | E,30,30,10,20,255    |
| q           | drawRoundRect  | x, y, w, h, r, color          | q,30,30,10,20,5,255  |
| Q           | fillRoundRect  | x, y, w, h, r, color          | Q,30,30,10,20,5,255  |
| t           | drawTriangle   | x1, y1, x2, y2, x3, y3, color | t,0,0,10,0,10,10,255 |
| T           | fillTriangle   | x1, y1, x2, y2, x3, y3, color | T,0,0,10,0,10,10,255 |
| W           | print          | x, y, text                    | W,10,10,hello        |
| F           | (font meta)    | font index, text size, color  | F,0,1,255            |
| Z           | (rate setting) | miliseconds                   | Z,1000               |

Instruction `F` is meta, as it sets font properties all at once, setTextSize, setTextColor, setFont.  Font index is setup in gfxpipe/gfxpipe.ino as an array of available / compiled fonts and `#0` is the default font.

Instruction `Z` sets the display refresh rate.  Code by default double-buffers and defaults at 300 ms, but you can override this for better results.


