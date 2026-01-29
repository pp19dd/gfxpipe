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
// instructions: modify this config until your display works, then use the
// Arduino IDE's serial monitor to send commands to it.  for example:
//     C,0
//     L,0,0,64,32,255
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// 1. communication settings
// ---------------------------------------------------------------------------
#define SERIAL_BAUD_RATE  115200 // 921600
#define SERIAL_BUFFER_SIZE  4096
#define KEEPALIVE_INTERVAL  5000
#define DEFAULT_DISPLAY_RATE 250

// ---------------------------------------------------------------------------
// 2. setup your display here, however it works
// ---------------------------------------------------------------------------
#include <SPI.h>
#include <Adafruit_GC9A01A.h>
#define TFT_SCK     12    // SCL  black wire  
#define TFT_MOSI    11    // SDA  brown wire
#define TFT_CS      10    // CS   orange wire
#define TFT_DC      9     // DC   red wire
#define TFT_RST     8     // RST  yellow wire
                          // GND  white wire
                          // VCC  gray wire


// drawing functions expect display_canvas, which is accessed from global scope
// don't forget to use \ as delimeter for multiple lines,
//               leave \ out of the last line
#define YOUR_DISPLAY_DECLARATION_CODE \
    Adafruit_GC9A01A display_device(TFT_CS, TFT_DC, TFT_RST); \
    GFXcanvas16 display_canvas(240, 240);

// runs in setup
#define YOUR_DISPLAY_SETUP_CODE \
    SPI.begin(TFT_SCK, -1, TFT_MOSI, TFT_CS); \
    display_device.begin(80000000); \
    display_device.setRotation(0);

// runs at end of loop(), when screen has changed at set rate (Z instruction) 
#define YOUR_DISPLAY_CALL \
    display_device.drawRGBBitmap(0, 0, display_canvas.getBuffer(), 240, 240);


// ---------------------------------------------------------------------------
// 3. include any fonts you'll be using
// ---------------------------------------------------------------------------
#include <Fonts/FreeSansBold24pt7b.h>

                                // indexed table of your fonts
const GFXfont* myFonts[] = {    // ------------------------------
    NULL,                       // 0: default system font
    &FreeSansBold24pt7b         // 1: (optional) your chosen font
};

