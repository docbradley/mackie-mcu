load("mcu_var.js");

// //////////////////////////////////////////////////// LCD Display ///////
function DisplayPage()
{
	this.textBuffer = [];

	for ( var i = 0; i < TOTAL_DISPLAY_SIZE; i++)
	{
		this.textBuffer[i] = ' ';
	}
}

DisplayPage.prototype.writeToColumnBuffer = function(row, column, text)
{
	var pos = row * DISPLAY_WIDTH + column * COLUMN_WIDTH;

	var forcedText = text.forceLength(COLUMN_WIDTH);

	for ( var i = 0; i < COLUMN_WIDTH; i++)
	{
		this.textBuffer[pos + i] = forcedText[i];
	}
};

DisplayPage.prototype.writeToFullDisplaySizeBuffer = function(row, position, text, len)
{
	var pos = row * DISPLAY_WIDTH + position;
	var forcedText = text.forceLength(len);
	for ( var i = 0; i < len; i++)
	{
		this.textBuffer[pos + i] = forcedText[i];
	}
};

DisplayPage.prototype.sendToLCD = function()
{
	var text = "";

	for ( var i = 0; i < TOTAL_DISPLAY_SIZE; i++)
	{
		text += this.textBuffer[i];
	}

	///////////  Send textBuffer contents to LCD display
	writeToLCD(0, 0, text, TOTAL_DISPLAY_SIZE);
};

function setDisplayPage(display_page)
{
	mcuActiveDisplayPage = display_page;
	displayPages[display_page].sendToLCD();

}

function writeToColumn(display_page, row, column, text)
{
	if (display_page == mcuActiveDisplayPage)
	{
		writeToLCD(row, 7 * column, text, 7);
	}

	displayPages[display_page].writeToColumnBuffer(row, column, text);
}

function writeToDisplay(display_page, row, position, text, len)
{
	if (display_page == mcuActiveDisplayPage)
	{
		writeToLCD(row, position, text, len);
	}

	displayPages[display_page].writeToFullDisplaySizeBuffer(row, position, text, len);
}

function writeToLCD(row, x, text, len)
{
	var pos = row * 0x38 + x;
	sendSysex(SYSEX_HDR + "12" + uint7ToHex(pos) + text.toHex(len) + "f7");
}

// //////////////////////////////////////////////// 8-digits displays //////

function setTransportPositionDisplay(position)
{
	if (isTempoDisplayActive)
	{
		for ( var i = 0; i < 7; i++)
		{
			var singleDigit = Number("0x30") + Number(position.slice(i, i + 1));
			// if ((i == 3 || i == 5) && singleDigit == 0x30) singleDigit = 0x20; //don't display "pre-zeros"
			sendChannelController(0, 73 - i, singleDigit);
		}
	}
	else
	{
		for ( var i = 0; i < 10; i++)
		{
			var singleDigit = Number("0x30") + Number(position.slice(i, i + 1));
			// if ((i == 3 || i == 5) && singleDigit == 0x30) singleDigit = 0x20; //don't display "pre-zeros"
			sendChannelController(0, 73 - i, singleDigit);
		}
	}
}
function setTransportTempoDisplay(tempo)
{
	if (isTempoDisplayActive)
	{
		if (parseInt(tempo) < 100)
		{
			for ( var i = 0; i < 2; i++)
			{
				var singleDigit = Number("0x30") + Number(tempo.slice(i, i + 1));

				sendChannelController(0, 66, 0x20);
				sendChannelController(0, 65 - i, singleDigit);
			}
		}
		else
		{
			for ( var i = 0; i < 3; i++)
			{
				var singleDigit = Number("0x30") + Number(tempo.slice(i, i + 1));
				sendChannelController(0, 66 - i, singleDigit);
			}
		}
	}
}
function setPageDisplay(page)
{
	var singleDigit = Number("0x31") + page;
	sendChannelController(0, 74, singleDigit);
	// for (var i = 0; i < 2; i++)
	// {
	// var singleDigit = Number("0x30") + Number(page.slice(i, i + 1));
	// sendChannelController(0, 76 - i, singleDigit);
	// }
}
function clearLCD()
{
	for ( var i = 0; i < 56; i++)
	{
		writeToLCD(0, 0, " ", 1);
		writeToLCD(0, 1, " ", 1);
	}
}