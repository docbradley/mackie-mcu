loadAPI(1);
load("mcu_display.js");
load("mcu_encoders.js");
load("mcu_var.js");

host.defineController("Mackie", "MCU PRO", "1.0", "515c9850-28e9-11e2-81c1-0800200c9a66");
host.defineMidiPorts(1, 1);
host.defineSysexDiscovery("f0 00 00 66 14 00 f7", "f0 00 00 66 14 01 ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? ?? f7");

var isShiftPressed = false;
var isResetPressed = false;
var isScrubPressed = false;
var isVpotPressed = initArray(false, 8);
var isFlipOn = false;
var isPlay = false;
var isPunchIn = false;
var isPunchOut = false;
var isGrooveOn = false;
var pageUp = VPOT_ASSIGN.EQ;
var pageDown = VPOT_ASSIGN.INSTRUMENT;

var mcuActiveEncoderPage = VPOT_PAGE.TRACK;
var mcuActiveDisplayPage = DISPLAY_PAGES.NAME_AND_VOLUME;
var activeSendPage = VPOT_PAGE.SEND0;
var activeDevicePage = VPOT_PAGE.DEVICE_PARAM;
var parameterPageBuffer = -1;
var vuMeter = [0,8];
var v_page = VPOT_PAGE.SEND0;
var d_page = DISPLAY_PAGES.NAME_AND_SEND0;
var activeVuMode = vuMode.LED;
var punchIO = Punch.OFF;
var parameterPageBuffer = 0;
var selectedTrack = 0;
var isTempoDisplayActive = true;
var numSendPages = 5;
var numDevicePages = 2;
var tempo = "110";
var returnToArrangement = MODIFIER.CONTROL;

var displayPages = [new DisplayPage(),new DisplayPage(),new DisplayPage(),new DisplayPage(),new DisplayPage(),new DisplayPage(),new DisplayPage(),new DisplayPage(),new DisplayPage()];
var encoderPages = [new EncoderPage(0),new EncoderPage(1),new EncoderPage(2),new EncoderPage(3),new EncoderPage(4),new EncoderPage(5),new EncoderPage(6),new EncoderPage(7),new EncoderPage(8),new EncoderPage(9),new EncoderPage(10)];

var automationWrite = false;
var automationWriteMode = "";

function init()
{
	clearLCD();
	writeToLCD(0, 0, "     ***  init Bitwig Studio Open API 1.0  ***", TOTAL_DISPLAY_SIZE);

	host.getMidiInPort(0).setMidiCallback(onMidi);

	// //////////////////////////////////////////////////////////////////////*Host*/
	application = host.createApplicationSection();
	cursorDevice = host.createCursorDeviceSection(8);
	cursorTrack = host.createCursorTrackSection(0, 1);
	// cursorClip = host.createCursorClipSection(16, 16);
	groove = host.createGrooveSection();
	masterTrack = host.createMasterTrackSection(0);
	trackBank = host.createTrackBankSection(8, numSendPages, 99);
	transport = host.createTransportSection();

	// //////////////////////////////////////////////////////////////////* TRANSPORT */

	transport.addIsPlayingObserver(function(on)
	{
		isPlay = on;
		sendNoteOn(0, TRANSPORT.PLAY, on ? 127 : 0);
		sendNoteOn(0, TRANSPORT.STOP, on ? 0 : 127);
	});
	transport.addIsLoopActiveObserver(function(on)
	{
		sendNoteOn(0, TRANSPORT.CYCLE, on ? 127 : 0);
	});
	transport.addIsRecordingObserver(function(on)
	{
		sendNoteOn(0, TRANSPORT.RECORD, on ? 127 : 0);
	});
	transport.addIsWritingArrangerAutomationObserver(function(on)
	{
		automationWrite = on;
	});
	transport.addIsWritingClipLauncherAutomationObserver(function(on)
	{
		sendNoteOn(0, AUTOMATION.TRIM, on ? 127 : 0);
	});
	transport.addAutomationWriteModeObserver(function(mode)
	{
		setAutomationModeLED(mode);
	});
	transport.addAutomationOverrideObserver(function(on)
	{
		sendNoteOn(0, AUTOMATION.GROUP, on ? 127 : 0);
	});
	transport.addPunchInObserver(function(on)
	{
		isPunchIn = on;
      sendNoteOn(0, TRANSPORT.REW, on ? 127 : 0);
	});
	transport.addPunchOutObserver(function(on)
	{
		isPunchOut = on;
      sendNoteOn(0, TRANSPORT.FF, on ? 127 : 0);
	});
	transport.addClickObserver(function(on)
	{
		sendNoteOn(0, TRANSPORT.CLICK, on ? 127 : 0);
	});
	transport.addOverdubObserver(function(on)
	{
		sendNoteOn(0, TRANSPORT.REPLACE, on ? 127 : 0);
	});

	transport.getPosition().addTimeObserver("", 3, 2, 2, 3, function(value)
	{
		setTransportPositionDisplay(value);
	});
	transport.getTempo().addValueDisplayObserver(3, "", function(value)
	{
		setTempo(value);
		isTempoDisplayActive ? setTransportTempoDisplay(value) : null;
	});

	// ///////////////////////////////////////////////////////////////////////* GROOVE */

	groove.getEnabled().addValueDisplayObserver(12, "", function(text)
	{
		if (text == "on")
		{
			sendNoteOn(0, TRANSPORT.SOLO, 127);
			isGrooveOn = true;
		}
		else
		{
			sendNoteOn(0, TRANSPORT.SOLO, 0);
			isGrooveOn = false;
		}
	});

	// //////////////////////////////////////////////////////////////////////* TRACK BANK */
	for ( var t = 0; t < 8; t++)
	{
		var track = trackBank.getTrack(t);
		track.addNameObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_VOLUME, 0, index, value);
			writeToColumn(DISPLAY_PAGES.NAME_AND_PAN, 0, index, value);
			for ( var s = 0; s < numSendPages; s++)
			{
				d_page = DISPLAY_PAGES.NAME_AND_SEND0 + s;
				writeToColumn(d_page, 0, index, value);
			}
		}));
		track.addVuMeterObserver(14, -1, true, makeIndexedFunction(t, function(index, vuMeter)
		{
			sendChannelPressure(0, parseInt(vuMeter) + (index << 4));
		}));

		track.getVolume().addValueDisplayObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_VOLUME, 1, index, value);
		}));
		track.getVolume().addValueObserver(16384, makeIndexedFunction(t, function(index, value)
		{
			encoderPages[VPOT_PAGE.VOLUME].setEncoder(index, value, 0, 0);
		}));

		track.getPan().addValueObserver(16384, makeIndexedFunction(t, function(index, value)
		{
			encoderPages[VPOT_PAGE.PAN].setEncoder(index, value, 1, 0);
			encoderPages[VPOT_PAGE.TRACK].setEncoder(index, value, 1, 0);

		}));
		track.getPan().addValueDisplayObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_PAN, 1, index, value);
		}));
		track.getPan().setLabel("P" + (t + 1));

		track.getSend(0).addValueObserver(16384, makeIndexedFunction(t, function(index, value)
		{
			encoderPages[VPOT_PAGE.SEND0].setEncoder(index, value, 0, 0);
		}));
		track.getSend(0).addValueDisplayObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_SEND0, 1, index, value);
		}));
		track.getSend(1).addValueObserver(16384, makeIndexedFunction(t, function(index, value)
		{
			encoderPages[VPOT_PAGE.SEND1].setEncoder(index, value, 0, 0);
		}));
		track.getSend(1).addValueDisplayObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_SEND1, 1, index, value);
		}));
		track.getSend(2).addValueObserver(16384, makeIndexedFunction(t, function(index, value)
		{
			encoderPages[VPOT_PAGE.SEND2].setEncoder(index, value, 0, 0);
		}));
		track.getSend(2).addValueDisplayObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_SEND2, 1, index, value);
		}));
		track.getSend(3).addValueObserver(16384, makeIndexedFunction(t, function(index, value)
		{
			encoderPages[VPOT_PAGE.SEND3].setEncoder(index, value, 0, 0);
		}));
		track.getSend(3).addValueDisplayObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_SEND3, 1, index, value);
		}));

		track.getSend(4).addValueObserver(16384, makeIndexedFunction(t, function(index, value)
		{
			encoderPages[VPOT_PAGE.SEND4].setEncoder(index, value, 0, 0);
		}));
		track.getSend(4).addValueDisplayObserver(6, "", makeIndexedFunction(t, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.NAME_AND_SEND4, 1, index, value);
		}));

		// for ( var s = 0; s < numSendPages; s++) /////////////////////////////////////not working??
		// {
		// v_page = VPOT_PAGE.SEND0 + s;
		// d_page = DISPLAY_PAGES.NAME_AND_SEND0 + s;
		// track.getSend(s).setLabel("S" + (t + 1));
		// 
		// track.getSend(s).addValueObserver(16384, makeIndexedFunction(t,
		// function(index, value)
		// {
		// encoderPages[v_page].setEncoder(index, value, 0, 0);
		// }));
		// track.getSend(s).addValueDisplayObserver(6, "", makeIndexedFunction(t,
		// function(index, value)
		// {
		// writeToColumn(d_page, 1, index, value);
		// }));
		// }//////////////////////////////////////////////////////////////////////////////////////////////

		track.addIsSelectedObserver(makeIndexedFunction(t, function(index, isSelected)
		{
			if (isSelected)
			{
				sendNoteOn(0, CHANNEL_BUTTON.SELECT0 + index, 127);
				setTrackSelected(index);
				if (mcuActiveDisplayPage == DISPLAY_PAGES.NAME_AND_VOLUME || mcuActiveDisplayPage == DISPLAY_PAGES.NAME_AND_PAN) setPageDisplay(index);
			}
			else sendNoteOn(0, CHANNEL_BUTTON.SELECT0 + index, 0);
		}));
		track.getMute().addValueObserver(makeIndexedFunction(t, function(index, on)
		{
			sendNoteOn(0, CHANNEL_BUTTON.MUTE0 + index, on ? 127 : 0);
		}));
		track.getSolo().addValueObserver(makeIndexedFunction(t, function(index, on)
		{
			sendNoteOn(0, CHANNEL_BUTTON.SOLO0 + index, on ? 127 : 0);
		}));
		track.getArm().addValueObserver(makeIndexedFunction(t, function(index, on)
		{
			sendNoteOn(0, CHANNEL_BUTTON.ARM0 + index, on ? 127 : 0);
		}));

		track.getVolume().setLabel("V" + (t + 1));
		track.getVolume().setIndication(true);

	}
	// /////////////////////////////////////////////////////////////// /* MASTER TRACK */

	masterTrack.getVolume().addValueObserver(16384, function(value)
	{
		sendPitchBend(8, value);
	});
	masterTrack.getVolume().setIndication(true);
	//
	// ///////////////////////////////////////////////////////////////* CURSOR DEVICE */

	cursorDevice.addSelectedPageObserver(0, function(page)
	{
		if (mcuActiveDisplayPage == DISPLAY_PAGES.DEVICE_PARAMETERS)
		{
			storeToParameterPageBuffer(page);
			setPageDisplay(page);
		}
		else storeToParameterPageBuffer(page);
	});
	for ( var p = 0; p < 8; p++)
	{
		var parameter = cursorDevice.getParameter(p);

		parameter.addNameObserver(6, "", makeIndexedFunction(p, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.DEVICE_PARAMETERS, 0, index, value);
		}));
		parameter.addValueDisplayObserver(6, "", makeIndexedFunction(p, function(index, value)
		{
			writeToColumn(DISPLAY_PAGES.DEVICE_PARAMETERS, 1, index, value);
		}));
		parameter.addValueObserver(16384, makeIndexedFunction(p, function(index, value)
		{
			encoderPages[VPOT_PAGE.DEVICE_PARAM].setEncoder(index, value, 0, 0);
			encoderPages[VPOT_PAGE.DEVICE_PRESETS].setEncoder(index, value, 0, 0);
		}));

		parameter.setLabel("P" + (p + 1));
	}

	cursorDevice.addPresetNameObserver(46, "-", function(name)
	{
		writeToDisplay(DISPLAY_PAGES.DEVICE_PRESETS, 0, 0, "  preset: " + name, 56);
	});
	cursorDevice.addPresetCategoryObserver(22, "-", function(category)
	{
		writeToDisplay(DISPLAY_PAGES.DEVICE_PRESETS, 1, 0, "category: " + category, 32);
	});
	cursorDevice.addPresetCreatorObserver(14, "-", function(creator)
	{
		writeToDisplay(DISPLAY_PAGES.DEVICE_PRESETS, 1, 31, " creator: " + creator, 24);
	});

	clearLCD();
	flushLEDs();
	// sendSysex(SYSEX_HDR + "61 f7"); //All faders to the bottom (doesn't work?)
	sendSysex(SYSEX_HDR + "62 f7"); // All leds off (doesn't work?)
	for ( var i = 0; i < 6; i++)
	{
		sendNoteOn(0, VPOT_ASSIGN.TRACK + i, 0); // VPOT-Assign LEDs all OFF
	}
	mcuActiveEncoderPage = VPOT_PAGE.TRACK;
	sendNoteOn(0, 0x72, 127); // Beats LED on
	sendNoteOn(0, VPOT_ASSIGN.TRACK, 127); // VPOT_Assign Track LED ON
	sendSysex(SYSEX_HDR + "0a 01 f7"); // Transport Button Klick OFF=0a 00
	// ,ON=0a 01

	// vu-meter
	sendSysex(SYSEX_HDR + "21 01 f7"); // set Global LCD meter mode to vertical
	for ( var j = 0; j < 8; j++)
	{
		sendSysex(SYSEX_HDR + "20 0" + j + " 00 f7"); // address all channel vuMode.OFF
		sendChannelPressure(0, 0xf + (j << 4)); // reset peak hold

	}
	// ----------tryout blinking lights in the automation section
	// for (var i=0;i<3;i++)
	// {
	// sendNoteOn(0, AUTOMATION.WRITE + i, 1))
	// }
	setIndications("pan");

}

function exit()
{
	clearLCD();
	writeToLCD(0, 0, "     ***  exit Bitwig Studio Open API 1.0  ***", TOTAL_DISPLAY_SIZE);
	for ( var j = 0; j < 8; j++)
	{
		sendSysex(SYSEX_HDR + "20 0" + j + "00 f7");
		// sendChannelPressure(0, 0xf + (j << 4));
	}
	sendSysex(SYSEX_HDR + "0a 00 f7"); // Transport Button Klick OFF=0a 00, ON=0a 01
//	sendSysex(SYSEX_HDR + "61 f7"); // All faders to the bottom
	sendSysex(SYSEX_HDR + "62 f7"); // All leds off
	sendSysex(SYSEX_HDR + "21 01 f7");// set Global LCD meter mode to vertical

}

function flush()
{
   sendNoteOn(0, AUTOMATION.READ_OFF, !automationWrite ? 127 : 0);
   sendNoteOn(0, AUTOMATION.LATCH, (automationWrite && automationWriteMode == "latch") ? 127 : 0);
   sendNoteOn(0, AUTOMATION.TOUCH, (automationWrite && automationWriteMode == "touch") ? 127 : 0);
   sendNoteOn(0, AUTOMATION.WRITE, (automationWrite && automationWriteMode == "write") ? 127 : 0);
}

/* ----------------------- onMidi ----------------- */

// /////// Knobs send/receive Midi Notes
// /////// MotorFaders send/receive PitchBend (14bit)
// /////// VPots send/receive Controller Messages

function onMidi(status, data1, data2)
{
	//printMidi(status, data1, data2);

	if (isPitchBend(status)) ////////only the motor faders send/receive pitch bend messages(14bit --> 0 - 16383)
	{
		var index = MIDIChannel(status);
		if (index < 8)
		{
			getFaderObjectPath(index).set(pitchBendValue(data1, data2), 16384 - 127);
		}
		if (index == 8) 
		{
			masterTrack.getVolume().set(pitchBendValue(data1, data2), 16384 - 127);
		}
	}

	/* ---------------------- isNoteOn --- */

	//all buttons, the click of the encoders and the touch of the motor faders send/receive note on messages (release a button = velocity 0)
	if (isNoteOn(status)) 
	{

		if (data1 == MODIFIER.SHIFT)
		{
			isShiftPressed = data2 > 0; //boolean that is true as long as the shift button is pressed
		}
		else if (data1 == MODIFIER.OPTION)
		{
			isResetPressed = data2 > 0; //boolean that is true as long as the reset button is pressed
		}
		else if (data1 == SCRUB) 
		{
			isScrubPressed = data2 > 0; //boolean that is true as long as the scrub button is pressed
		}

		else if (data1 >= VPOT_CLICK0 && data1 < (VPOT_CLICK0 + 8)) //
		{
			if (isResetPressed)
			{
				getEncoderObjectPath(data1 - VPOT_CLICK0).reset(); // if reset is pressed, reset the parameter of the clicked encoder to its default value

			}

			else isVpotPressed[data1 - VPOT_CLICK0] = data2 > 0; // as long as an encoder is clicked (and reset is not) the range is set to fine tune
		}

		if (data2 > 0) // Check button presses (but not releases) in here
		{

			if (data1 >= VPOT_ASSIGN.TRACK && data1 <= VPOT_ASSIGN.INSTRUMENT) //  the 4 mode buttons change the vpot assignement and what's displayed 
			{
				switch (data1)
				{
					case VPOT_ASSIGN.TRACK:
						if (mcuActiveEncoderPage != VPOT_PAGE.TRACK)
						{
							setEncoderPage(VPOT_PAGE.TRACK);
							setDisplayPage(DISPLAY_PAGES.NAME_AND_VOLUME);
							setPageDisplay(selectedTrack);
							sendNoteOn(0, VPOT_ASSIGN.TRACK, 127);
							sendNoteOn(0, VPOT_ASSIGN.SEND, 0);
							sendNoteOn(0, VPOT_ASSIGN.PAN, 0);
							sendNoteOn(0, VPOT_ASSIGN.DEVICE, 0);
							setIndications("pan");
							switchVuMode(activeVuMode);

						}
						break;
					case VPOT_ASSIGN.SEND:
						if (mcuActiveEncoderPage == activeSendPage) // if already in send mode, switch the send page
						{
							switchActiveSendPage();
							setPageDisplay(activeSendPage - 4);
							setEncoderPage(activeSendPage);
							setDisplayPage(activeSendPage);
							setIndications("send");
						}
						else if (mcuActiveEncoderPage != VPOT_PAGE.SEND0 && mcuActiveEncoderPage != VPOT_PAGE.SEND1 && mcuActiveEncoderPage != VPOT_PAGE.SEND2 && mcuActiveEncoderPage != VPOT_PAGE.SEND3 && mcuActiveEncoderPage != VPOT_PAGE.SEND4)
						{
							setPageDisplay(activeSendPage - 4);
							setEncoderPage(activeSendPage);
							setDisplayPage(activeSendPage);
							sendNoteOn(0, VPOT_ASSIGN.TRACK, 0);
							sendNoteOn(0, VPOT_ASSIGN.SEND, 127);
							sendNoteOn(0, VPOT_ASSIGN.PAN, 0);
							sendNoteOn(0, VPOT_ASSIGN.DEVICE, 0);
							setIndications("send");
							switchVuMode(activeVuMode);
						}
						break;
					case VPOT_ASSIGN.PAN:
						if (mcuActiveEncoderPage != VPOT_PAGE.PAN)
						{
							setEncoderPage(VPOT_PAGE.PAN);
							setDisplayPage(DISPLAY_PAGES.NAME_AND_PAN);
							setPageDisplay(selectedTrack);
							sendNoteOn(0, VPOT_ASSIGN.TRACK, 0);
							sendNoteOn(0, VPOT_ASSIGN.SEND, 0);
							sendNoteOn(0, VPOT_ASSIGN.PAN, 127);
							sendNoteOn(0, VPOT_ASSIGN.DEVICE, 0);
							setIndications("pan");
							switchVuMode(activeVuMode);
						}
						break;
					case VPOT_ASSIGN.DEVICE:
						if (mcuActiveEncoderPage == activeDevicePage) // if already in device mode, toggle between displaying mapped parameters or device presets
						{
							switchActiveDevicePage();
							setEncoderPage(activeDevicePage);
							setDisplayPage(activeDevicePage);
							setIndications("device");
							if (activeDevicePage == VPOT_PAGE.DEVICE_PARAM) setPageDisplay(parameterPageBuffer);
						}
						else if (mcuActiveEncoderPage != VPOT_PAGE.DEVICE_PARAM && mcuActiveEncoderPage != VPOT_PAGE.DEVICE_PRESETS)
						{
							setEncoderPage(activeDevicePage);
							setDisplayPage(activeDevicePage);
							sendNoteOn(0, VPOT_ASSIGN.TRACK, 0);
							sendNoteOn(0, VPOT_ASSIGN.PAN, 0);
							sendNoteOn(0, VPOT_ASSIGN.SEND, 0);
							sendNoteOn(0, VPOT_ASSIGN.DEVICE, 127);
							setIndications("device");
							if (activeDevicePage == VPOT_PAGE.DEVICE_PARAM) setPageDisplay(parameterPageBuffer);
						}
						switch (activeVuMode)
						{
							case vuMode.LED:
								break;
							case vuMode.LED_AND_LCD:
								for ( var i = 0; i < 8; i++)
								{
									sendChannelPressure(0, 0 + (i << 4));
									sendSysex(SYSEX_HDR + "20 0" + i + "01 f7");
								}
								break;
							case vuMode.LCD:
								for ( var i = 0; i < 8; i++)
								{
									sendChannelPressure(0, 0 + (i << 4));
									sendSysex(SYSEX_HDR + "20 0" + i + "01 f7");
								}
								break;
							default:
								for ( var i = 0; i < 8; i++)
								{
									sendChannelPressure(0, 0 + (i << 4));
									sendSysex(SYSEX_HDR + "20 0" + i + "00 f7");
								}
						}
						break;
					case pageUp: //select previous device on selected track or with shift pressed: select previous parameter page on selected device
						!isShiftPressed ? cursorDevice.previousParameterPage() : cursorDevice.selectPrevious();
						// setIndications("device");
						break;
					case pageDown: //select next device on selected track or with shift pressed: select next parameter page on selected device
						!isShiftPressed ? cursorDevice.nextParameterPage() : cursorDevice.selectNext();
						// setIndications("device");
						break;
				}
			}

			// ///////////////////////////////////// channel buttons ///////

			else if (data1 >= 0 && data1 <= 7) // is one of the arm buttons pressed
			{
				var index = data1 - CHANNEL_BUTTON.ARM0; //which arm button is pressed
				trackBank.getTrack(index).getArm().toggle(); // tell the application to toggle the state of the corresponding arm button
			}

			else if (data1 >= 8 && data1 <= 15) // is one of the solo buttons pressed
			{
				var index = data1 - CHANNEL_BUTTON.SOLO0; //which solo button is pressed
				trackBank.getTrack(index).getSolo().toggle(); // tell the application to toggle the state of the corresponding solo button
			}
			else if (data1 >= 16 && data1 <= 23) // is one of the mute buttons pressed
			{

				var index = data1 - CHANNEL_BUTTON.MUTE0; //which mute button is pressed
				trackBank.getTrack(index).getMute().toggle(); // tell the application to toggle the state of the corresponding mute button
			}
			else if (data1 >= 24 && data1 <= 31) // is a select button pressed
			{

				var index = data1 - CHANNEL_BUTTON.SELECT0; //which select button is pressed
				trackBank.getTrack(index).select(); // tell the application to toggle the state of the corresponding arm button
			}
			else if (data1 >= 54 && data1 <= 61) // is one of the f buttons pressed
			{
				var index = data1 - SET_PAGE0; //which f button is pressed
				if (mcuActiveEncoderPage == VPOT_PAGE.DEVICE_PARAM)
				{
					cursorDevice.setParameterPage(index);
					// setIndications("device");
				}
				else if (mcuActiveEncoderPage == VPOT_PAGE.DEVICE_PRESETS) //browse presets,preset category, preset creator
				{
					switch (index)
					{
						case 0:
							cursorDevice.switchToPreviousPreset();
							break;
						case 1:
							cursorDevice.switchToNextPreset();
							break;
						case 2:
							cursorDevice.switchToPreviousPresetCategory();
							break;
						case 3:
							cursorDevice.switchToNextPresetCategory();
							break;
						case 4:
							cursorDevice.switchToPreviousPresetCreator();
							break;
						case 5:
							cursorDevice.switchToNextPresetCreator();
							break;
						case 6:
							break;
						case 7:
							break;
					}
				}
				else if ((mcuActiveEncoderPage >= VPOT_PAGE.SEND0 && mcuActiveEncoderPage <= VPOT_PAGE.SEND4) && index < numSendPages) //select send page
				{
					activeSendPage = index + 4;
					setPageDisplay(activeSendPage - 4);
					setEncoderPage(activeSendPage);
					setDisplayPage(activeSendPage);
					setIndications("send");
				}
			}

			// /////////////////////////////// transport ///////

			switch (data1)
			{
				case TRANSPORT.PLAY:
					transport.play();
					break;
				case TRANSPORT.STOP:
					transport.stop();
					break;
				case TRANSPORT.RECORD:
					transport.record();
					break;
				case TRANSPORT.REW:
               if (isShiftPressed)
               {
					   transport.togglePunchIn();
               }
               else
               {
                  transport.rewind();
               }
					break;
				case TRANSPORT.FF:
               if (isShiftPressed)
               {
					   transport.togglePunchOut();
               }
               else
               {
                  transport.fastForward();
               }
					break;
				case TRANSPORT.CYCLE:
					transport.toggleLoop();
					break;
				case TRANSPORT.CLICK:
					transport.toggleClick();
					break;
				case TRANSPORT.SOLO:
					if (isGrooveOn)
						groove.getEnabled().set(0, 127);
					else groove.getEnabled().set(127, 127);
					break;
				case AUTOMATION.TRIM:
					transport.toggleWriteClipLauncherAutomation();
					break;
            case AUTOMATION.GROUP:
               transport.resetAutomationOverrides();
               break;
				case AUTOMATION.READ_OFF:
               if (isShiftPressed)
               {
					   transport.resetAutomationOverrides();
               }
               else if (automationWrite)
               {
                  transport.toggleWriteArrangerAutomation();
               }
					break;
				case AUTOMATION.LATCH:
					transport.setAutomationWriteMode("latch");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
				case AUTOMATION.TOUCH:
					transport.setAutomationWriteMode("touch");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
				case AUTOMATION.WRITE:
					transport.setAutomationWriteMode("write");
               if (!automationWrite) transport.toggleWriteArrangerAutomation();
					break;
				case TRANSPORT.REPLACE:
					transport.toggleOverdub();
					break;
				case returnToArrangement:
					trackBank.getTrack(selectedTrack).getClipLauncher().returnToArrangement();
					break;
				case FADER_BANKS.FLIP:
					toggleFlip();
					break;
				case FADER_BANKS.BANK_UP:
					trackBank.scrollTracksPageUp();
					// setIndications("pan");
					break;
				case FADER_BANKS.BANK_DOWN:
					trackBank.scrollTracksPageDown();
					// setIndications("pan");
					break;
				case FADER_BANKS.CHANNEL_UP:
					cursorTrack.selectPrevious();
					break;
				case FADER_BANKS.CHANNEL_DOWN:
					cursorTrack.selectNext();
					break;
				case APPLICATION.UNDO_REDO:
					if (isShiftPressed)
						application.redo();
					else application.undo();
					sendNoteOn(0, APPLICATION.UNDO_REDO, 127);
					break;
            case APPLICATION.CANCEL:
               application.escape();
               break;
            case APPLICATION.ENTER:
               application.enter();
               break;
				case APPLICATION.TOGGLE_NOTE_EDITOR:
					application.toggleNoteEditor();
					break;
				case APPLICATION.TOGGLE_DEVICES:
					application.toggleDevices();
					break;
				case APPLICATION.TOGGLE_AUTOMATION_EDITOR:
					application.toggleAutomationEditor();
					break;
				case APPLICATION.TOGGLE_MIXER:
					application.toggleMixer();
					break;
				case APPLICATION.TOGGLE_BROWSER:
					application.toggleBrowserVisibility();
					break;
				case TOGGLE_VU_METER:
					switchVuMode(activeVuMode + 1);
					break;
				case TOGGLE_TEMPO_OR_TICKS:
               toggleTempoOrTicks();
               break;
            case NAVI.LEFT:
               if (isShiftPressed) application.focusPanelToLeft();
               else application.arrowKeyLeft();
               break;
            case NAVI.RIGHT:
               if (isShiftPressed) application.focusPanelToRight();
               else application.arrowKeyRight();
               break;
            case NAVI.UP:
               if (isShiftPressed) application.focusPanelAbove();
               else application.arrowKeyUp();
               break;
            case NAVI.DOWN:
               if (isShiftPressed) application.focusPanelBelow();
               else application.arrowKeyDown();
               break;
            case NAVI.ZOOM:
               // TODO
               break;
         }
		}
		else if (data2 == 0) // Check button release, no press
		{
			switch (data1)
			{
				case APPLICATION.UNDO_REDO:
					sendNoteOn(0, APPLICATION.UNDO_REDO, 0);
					break;
			}
		}
		if (data1 >= FADERTOUCH0 && data1 < FADERTOUCH0 + 8) //if a fader is released..
		{
			if (isResetPressed)
			{
				var t = data1 - FADERTOUCH0;
				getFaderObjectPath(t).reset(); // ..reset the corresponding parameter to its default value (if flip is off, this is the volume)
			}
		}
		else if (data1 == FADERTOUCH0 + 8) // masterfader
		if (isResetPressed)
		{
			masterTrack.getVolume().set(11163, 16384);
		}
	}

	// ////////////////////////////////////// isChannelController //////

	if (isChannelController(status)) //encoders(vpots) and the wheel send/receive channel controller messages
	{
		var index = 0;
		data1 != TRANSPORT.WHEEL ? index = data1 - VPOT0 : index = data1; // distinguish vpots from wheel
		var relativeRange = isVpotPressed[index] || isShiftPressed ? 1000 : 200; // set relative range dependent on if vpot or shift is pressed
		var delta = data2;
		if (delta > 64) // if an encoder is turned counterclockwise..
		{
			delta = (-1) * (Math.round(delta) - 64); // ..do this math
		}

		/* vpots */
		if (data1 >= VPOT0 && data1 < (VPOT0 + 8)) // if the cc comes from a vpot..
		{
			isFlipOn ? trackBank.getTrack(index).getVolume().inc(delta, relativeRange) : getEncoderObjectPath(index).inc(delta, relativeRange); // ..get the target parameter dependent on the active encoder page and if flip is on or off
		}
		else if (data1 == TRANSPORT.WHEEL) // increasePosition didn't work (trunk 2740). for now the wheel changes the tempo
		{
			if (isShiftPressed)
         {
            transport.increaseTempo(delta, isScrubPressed ? 6461 : 1293); // relativeRange: 647 = full, 1293 = half, 3231 = 1/5, 6461 = 1/10 bpm steps
         }
         else
         {
            transport.incPosition(delta, true);
         }
		}
	}
}
function onSysex(data)
{
}

function switchVuMode(mode) // leds on/leds and vu-meter on display on/vu-meter on display on/all off
{
	if (activeVuMode != mode)
	{
		if (activeVuMode < NUM_VU_MODES)
			activeVuMode = mode;
		else activeVuMode = vuMode.LED; 
		if (mcuActiveEncoderPage == VPOT_PAGE.DEVICE_PARAM) // no vu-meter on display when in device mode
		{
			switch (activeVuMode)
			{
				case vuMode.LED_AND_LCD:
					activeVuMode = vuMode.OFF;
					break;
				case vuMode.LCD:
					activeVuMode = vuMode.OFF;
					break;
			}
		}
	}
	switch (activeVuMode) // the mcu changes the vu-meter mode when receiving the corresponding sysex message
	{
		case vuMode.LED:
			for ( var i = 0; i < 8; i++)
			{
				sendChannelPressure(0, 0 + (i << 4)); // resets the leds (and vu-meters on the display?) 
				sendSysex(SYSEX_HDR + "20 0" + i + "01 f7");
			}
			break;
		case vuMode.LED_AND_LCD:
			for ( var i = 0; i < 8; i++)
			{
				sendChannelPressure(0, 0 + (i << 4));
				sendSysex(SYSEX_HDR + "20 0" + i + "03 f7");
			}
			break;
		case vuMode.LCD:
			for ( var i = 0; i < 8; i++)
			{
				sendChannelPressure(0, 0 + (i << 4));
				sendSysex(SYSEX_HDR + "20 0" + i + "06 f7");
			}
			break;
		case vuMode.OFF:
			for ( var i = 0; i < 8; i++)
			{
				sendChannelPressure(0, 0 + (i << 4), 0);
				sendSysex(SYSEX_HDR + "20 0" + i + "00 f7");
			}
			break;
	}
}

function makeIndexedFunction(index, f) // this is needed to 
{
	return function(value)
	{
		f(index, value);
	};
}

// if (index >= Observer.VU_METER0 && index < (Observer.VU_METER0 + 8))
// {
// var channel = index - Observer.VU_METER0;
// sendMidi(new ChannelPressure(0, parseInt(message) + (channel << 4)));
// }
function getFaderObjectPath(index) // for now this is mainly used for the flip
{
	if (isFlipOn)
	{
		switch (mcuActiveEncoderPage)
		{
			case VPOT_PAGE.TRACK:
				return trackBank.getTrack(index).getPan();
				break;
			case VPOT_PAGE.PAN:
				return trackBank.getTrack(index).getPan();
				break;
			case VPOT_PAGE.DEVICE_PARAM:
				return cursorDevice.getParameter(index);
				break;
			case VPOT_PAGE.DEVICE_PRESETS:
				return cursorDevice.getParameter(index);
				break;
			case VPOT_PAGE.SEND0:
				return trackBank.getTrack(index).getSend(0);
				break;
			case VPOT_PAGE.SEND1:
				return trackBank.getTrack(index).getSend(1);
				break;
			case VPOT_PAGE.SEND2:
				return trackBank.getTrack(index).getSend(2);
				break;
			case VPOT_PAGE.SEND3:
				return trackBank.getTrack(index).getSend(3);
				break;
			case VPOT_PAGE.SEND4:
				return trackBank.getTrack(index).getSend(4);
				break;
		}
	}
	else return trackBank.getTrack(index).getVolume();
}

function toggleFlip() // toggle flip on/off and send all values to all vpots and faders
{
	switch (isFlipOn)
	{
		case true:
			isFlipOn = false;
			sendNoteOn(0, FADER_BANKS.FLIP, 0);
			encoderPages[mcuActiveEncoderPage].sendAllValuesToVpots();
			encoderPages[VPOT_PAGE.VOLUME].sendAllValuesToFaders();
			break;
		case false:
			isFlipOn = true;
			sendNoteOn(0, FADER_BANKS.FLIP, 127);
			encoderPages[mcuActiveEncoderPage].sendAllValuesToFaders();
			encoderPages[VPOT_PAGE.VOLUME].sendAllValuesToVpots();
			break;
	}
}

function flushLEDs() 
{
	sendNoteOn(0, FADER_BANKS.FLIP, 0);
	sendNoteOn(0, FADER_BANKS.GLOBAL_VIEW, 0);
}

function setAutomationModeLED(mode) 
{
   automationWriteMode = mode;
}
function switchActiveSendPage() // when the active encoder page is 'send' and the send mode button is pressed 
{
	if (activeSendPage < numSendPages + 3)
		activeSendPage += 1;
	else activeSendPage = VPOT_PAGE.SEND0;
}

function switchActiveDevicePage()
{
	if (activeDevicePage < numDevicePages + 1)
		activeDevicePage += 1;
	else activeDevicePage = VPOT_PAGE.DEVICE_PARAM;
}

function storeToParameterPageBuffer(page) // stores the page number of the parameter page so it can be recalled when switching to another mode and back
{
	this.parameterPageBuffer = page;
}

function getActiveParameterPage() // returns the page number of the active parameter page
{
	return parameterPageBuffer;
}

function setIndications(page) // sets the color indication in the application depending on what the encoders currently control
{
	switch (page)
	{
		case "pan":
			for ( var i = 0; i < 8; i++)
			{
				var track = trackBank.getTrack(i);
				var parameter = cursorDevice.getParameter(i);
				// track.getVolume().setIndication(true);
				track.getPan().setIndication(true);
				track.getSend(activeSendPage - 4).setIndication(false);
				parameter.setIndication(false);
			}
			break;
		case "send":
			for ( var i = 0; i < 8; i++)
			{
				var track = trackBank.getTrack(i);
				var parameter = cursorDevice.getParameter(i);

				// track.getVolume().setIndication(true);
				track.getPan().setIndication(false);
				parameter.setIndication(false);

				for ( var s = 0; s < numSendPages; s++)
				{
					track.getSend(s).setIndication(false);
				}
				track.getSend(activeSendPage - 4).setIndication(true);
			}
			break;
		case "device":
			for ( var i = 0; i < 8; i++)
			{
				var track = trackBank.getTrack(i);
				var parameter = cursorDevice.getParameter(i);

				parameter.setIndication(true);
				track.getPan().setIndication(false);
				track.getSend(activeSendPage - 4).setIndication(false);
			}
			break;
	}
}

function setTrackSelected(index) // stores the index of the currently selected track so it can be recalled when switching to another mode and back
{
	this.selectedTrack = index;
}

function toggleTempoOrTicks() // toggles the last 3 digits of the transport display between tempo or ticks
{
	isTempoDisplayActive = !isTempoDisplayActive;
	setTransportTempoDisplay(getTempoValue());
}

function setTempo(t) // stores the current tempo from the tempo observer
{
	this.tempo = t;
}

function getTempoValue() // returns the stored tempo so it can be displayed on the last 3 digits of the transport display
{
	return tempo;
}
