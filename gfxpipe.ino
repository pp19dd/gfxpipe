// ---------------------------------------------------------------------------
//                        ▄▀▀                  ▀
//                ▄▄▄▄  ▄▄█▄▄  ▄   ▄  ▄▄▄▄   ▄▄▄    ▄▄▄▄    ▄▄▄
//               █▀ ▀█    █     █▄█   █▀ ▀█    █    █▀ ▀█  █▀  █
//               █   █    █     ▄█▄   █   █    █    █   █  █▀▀▀▀
//               ▀█▄▀█    █    ▄▀ ▀▄  ██▄█▀  ▄▄█▄▄  ██▄█▀  ▀█▄▄▀
//                ▄  █                █             █
//                 ▀▀                 ▀             ▀
// ---------------------------------------------------------------------------
// LICENSE: CC0 1.0 Universal
// ---------------------------------------------------------------------------
// See docs at https://github.com/pp19dd/gfxpipe/
// ---------------------------------------------------------------------------
// instructions: modify config.h until your display works, then use the
// Arduino IDE's serial monitor to send commands to it.  for example:
//     C,0
//     L,0,0,64,32,255
// ---------------------------------------------------------------------------

// required: this whole program is meant to drive components of this library
#include <Adafruit_GFX.h>

// required: edit the config.h file to make your display work
#include "config.h"

// leave this as-is, adjust it in config.h
#ifdef YOUR_DISPLAY_DECLARATION_CODE
YOUR_DISPLAY_DECLARATION_CODE;
#endif

// ---------------------------------------------------------------------------
// global variables, designed and written by a very lazy person
// ---------------------------------------------------------------------------
unsigned long last_check = 0;
unsigned long last_command = 0;
unsigned long last_draw = 0;
uint16_t color = 65535;
uint16_t rate = DEFAULT_DISPLAY_RATE;
int x, y, x2, y2, x3, y3, w, h, r, rw, rh, ir, c, f, s;

void setup() {
    Serial.setRxBufferSize(SERIAL_BUFFER_SIZE);
    Serial.begin(SERIAL_BAUD_RATE);
    Serial.println( "starting gfxpipe server..." );

    // flow control keepalive
    last_command = millis();
    last_check = millis();

    Serial.println( "starting your display..." );
    #ifdef YOUR_DISPLAY_SETUP_CODE
    YOUR_DISPLAY_SETUP_CODE;
    #endif
}

// ---------------------------------------------------------------------------
// expects to parse commands in this format:
// instruction,parameter1,parameter2,...,parameterN\n
// ---------------------------------------------------------------------------
void executeCommand(String line) {
    line.trim();
    if( line.length() < 1 ) return;

    char cmd = line[0];

    // substring(2) skips the command letter and the first comma
    String params = (line.length() > 2) ? line.substring(2) : ""; 

    switch( cmd ) {
        case 'S': // clear screen: S,color
            if( sscanf(params.c_str(), "%d", &c) == 1 ) {
                display_canvas.fillScreen((uint16_t)c);
            }
            break;

        case 'L': // line: L,x1,y1,x2,y2,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d", &x, &y, &x2, &y2, &c) == 5) {
                display_canvas.drawLine(x, y, x2, y2, (uint16_t)c);
            }
            break;

        case 'P': // pixel: P,x,y,color
            if( sscanf(params.c_str(), "%d,%d,%d", &x, &y, &c) == 3) {
                display_canvas.drawPixel(x, y, (uint16_t)c);
            }
            break;

        case 'r': // rectangle: r,x,y,w,h,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d", &x, &y, &w, &h, &c) == 5) {
                display_canvas.drawRect(x, y, w, h, (uint16_t)c);
            }
            break;

        case 'R': // filled rectangle: R,x,y,w,h,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d", &x, &y, &w, &h, &c) == 5 ) {
                display_canvas.fillRect(x, y, w, h, (uint16_t)c);
            }
            break;

        case 'c': // circle: c,x,y,r,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d", &x, &y, &r, &c) == 4 ) {
                display_canvas.drawCircle(x, y, r, (uint16_t)c);
            }
            break;

        case 'C': // filled circle: C,x,y,r,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d", &x, &y, &r, &c) == 4 ) {
                display_canvas.fillCircle(x, y, r, (uint16_t)c);
            }
            break;

        case 'e': // ellipse: e,x,y,rw,rh,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d", &x, &y, &rw, &rh, &c) == 5 ) {
                display_canvas.drawEllipse(x, y, rw, rh, (uint16_t)c);
            }
            break;

        case 'E': // filled ellipse: E,x,y,rw,rh,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d", &x, &y, &rw, &rh, &c) == 5 ) {
                display_canvas.fillEllipse(x, y, rw, rh, (uint16_t)c);
            }
            break;

        case 'q': // Rounded Rectangle: q,x,y,w,h,r,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d,%d", &x, &y, &w, &h, &r, &c) == 6 ) {
                display_canvas.drawRoundRect(x, y, w, h, r, (uint16_t)c);
            }
            break;

        case 'Q': // Fill Round Rect: Q,x,y,w,h,r,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d,%d", &x, &y, &w, &h, &r, &c) == 6 ) {
                display_canvas.fillRoundRect(x, y, w, h, r, (uint16_t)c);
            }
            break;

        case 't': // triangle: t,x1,y1,x2,y2,x3,y3,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d,%d,%d", &x, &y, &x2, &y2, &x3, &y3, &c) == 7 ) {
                display_canvas.drawTriangle(x, y, x2, y2, x3, y3, (uint16_t)c);
            }
            break;

        case 'T': // filled triangle: T,x1,y1,x2,y2,x3,y3,color
            if( sscanf(params.c_str(), "%d,%d,%d,%d,%d,%d,%d", &x, &y, &x2, &y2, &x3, &y3, &c) == 7 ) {
                display_canvas.fillTriangle(x, y, x2, y2, x3, y3, (uint16_t)c);
            }
            break;

        case 'Z': // redraw rate setting: ms (1000 default)
            if (sscanf(params.c_str(), "%d", &rate) == 1) {
                
            }
            break;

        case 'F': // set font style: F,font_index,font_size,color
            if( sscanf(params.c_str(), "%d,%d,%d", &f, &s, &c) == 3 ) {
                
                // bounds check on myFonts array
                if( f >= 0 && f < (sizeof(myFonts) / sizeof(myFonts[0])) ) {
                    display_canvas.setFont(myFonts[f]);
                }
                display_canvas.setTextSize(s);
                display_canvas.setTextColor((uint16_t)c);
            }
            break;

        case 'W': { // print text: W,x,y,text
            int firstComma = params.indexOf(',');
            int secondComma = params.indexOf(',', firstComma + 1);
            if( firstComma != -1 && secondComma != -1 ) {
                x = params.substring(0, firstComma).toInt();
                y = params.substring(firstComma + 1, secondComma).toInt();
                String msg = params.substring(secondComma + 1);
                display_canvas.setCursor(x, y);
                display_canvas.print(msg);
            }
            break;
        }
    }
}

void loop() {

    // keepalive check, nudges node.js program to send info
    if( millis() - last_check > KEEPALIVE_INTERVAL ) {
        last_check = millis();

        if( millis() - last_command > KEEPALIVE_INTERVAL ) {
            last_command = millis();
            
            // let node.js program know to send another line
            Serial.print(".");
        }
    }

    // commands sent, process them
    if( Serial.available() ) {
        String line = Serial.readStringUntil('\n');
        line.trim();
        if( line.length() > 0 ) {
            executeCommand(line);
        }
        
        // let node.js program know to send another line
        Serial.print('.');

        // keepalive doesn't need to run for another __ seconds
        last_command = millis();
        last_check = millis();

    } else {

        // redraw screen at this interval:
        //  longer # - slower time to draw, but overall faster
        // shorter # - faster time to draw, but overall slower

        if( millis() - last_draw > rate ) {
            // tft.drawRGBBitmap(0, 0, canvas.getBuffer(), 240, 240);
            
            #ifdef YOUR_DISPLAY_CALL
            YOUR_DISPLAY_CALL;
            #endif
            
            last_draw = millis();
        }
    }
}