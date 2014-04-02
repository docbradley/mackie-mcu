///////////////////////////////////////////////////////////////
var CHANNEL_BUTTON =
{
	ARM0 : 0,
	SOLO0 : 8,
	MUTE0 : 16,
	SELECT0 : 24
};

var MODIFIER =
{
	SHIFT : 70,
	OPTION : 71,
	CONTROL : 72,
	ALT : 73
};

var VPOT_ASSIGN =
{
	TRACK : 40,
	SEND : 41,
	PAN : 42,
	DEVICE : 43,
	EQ : 44,
	INSTRUMENT : 45
};

var FADER_BANKS =
{
	BANK_UP : 46,
	BANK_DOWN : 47,
	CHANNEL_DOWN : 49,
	CHANNEL_UP : 48,
	FLIP : 50,
	GLOBAL_VIEW : 51
};

var AUTOMATION =
{
	READ_OFF : 74,
	WRITE : 75,
	TRIM : 76,
	TOUCH : 77,
	LATCH : 78,
	GROUP : 79
};

var NAVI =
{
	UP : 96,
	DOWN : 97,
	LEFT : 98,
	RIGHT : 99,
	ZOOM : 100
};

var TRANSPORT =
{
	REW : 91,
	FF : 92,
	STOP : 93,
	PLAY : 94,
	RECORD : 95,
   MARKER : 84,
	NUDGE :85,
	CYCLE : 86,
	DROP : 87,
	REPLACE : 88,
	CLICK : 89,
	SOLO : 90,
	WHEEL : 60
};

var VPOT_PAGE =
{
	TRACK : 0,
	PAN : 1,
	DEVICE_PARAM : 2,
	DEVICE_PRESETS : 3,
	SEND0 : 4,
	SEND1 : 5,
	SEND2 : 6,
	SEND3 : 7,
	SEND4 : 8,
	EQ : 9,
	VOLUME : 10
};

var DISPLAY_PAGES =
{
	NAME_AND_VOLUME : 0,
	NAME_AND_PAN : 1,
	DEVICE_PARAMETERS : 2,
	DEVICE_PRESETS : 3,
	NAME_AND_SEND0 : 4,
	NAME_AND_SEND1 : 5,
	NAME_AND_SEND2 : 6,
	NAME_AND_SEND3 : 7,
	NAME_AND_SEND4 : 8
};

var APPLICATION =
{
	TOGGLE_NOTE_EDITOR : 62,
	TOGGLE_AUTOMATION_EDITOR : 63,
   TOGGLE_DEVICES : 64,
   TOGGLE_MIXER : 65,
	TOGGLE_BROWSER : 69,
	SAVE : 80,
   UNDO_REDO : 81,
   CANCEL : 82,
   ENTER : 83
};

var vuMode =
{
		LED : 1,
		OFF : 2,
		LED_AND_LCD : 3,
		LCD : 4
};

var Punch =
{
		OFF : 0,
		IN : 1,
		OUT : 2,
		INOUT : 3
};

var VPOT0 = 16;
var VPOT_CLICK0 = 32;
var FADERTOUCH0 = 104;
var SET_PAGE0 = 54;
var SCRUB = 101;

var DISPLAY_WIDTH = 56;
var COLUMN_WIDTH = 7;
var TOTAL_DISPLAY_SIZE = DISPLAY_WIDTH * 2;
var NUM_VU_MODES = 4;
var TOGGLE_VU_METER = 52;
var TOGGLE_TEMPO_OR_TICKS = 53;
//var VOLUME_DEFAULT_VALUE = 11163;
//var PAN_DEFAULT_VALUE = 8191;
//var DEVICE_DEFAULT_VALUE = 8191;
//var SEND_DEFAULT_VALUE = 0;
var SYSEX_HDR = "f0 00 00 66 14";




