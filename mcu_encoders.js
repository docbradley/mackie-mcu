load("mcu_var.js");

function EncoderPage(pageIndex)
{
	this.valueBuffer = [0,8];
	this.defaultValueBuffer = [0,8];
	this.ledBuffer = [0,8];
	this.pageIndex = pageIndex;

	for ( var i = 0; i < 8; i++)
	{
		this.ledBuffer[i] = 0;
	}
}

EncoderPage.prototype.sendValueToVpot = function(index)
{
	sendChannelController(0, 0x30 | index, this.ledBuffer[index]);
};

EncoderPage.prototype.sendAllValuesToVpots = function()
{
	for ( var i = 0; i < 8; i++)
	{
		this.sendValueToVpot(i);
	}
};
EncoderPage.prototype.sendValueToFader = function(index)
{
	sendPitchBend(index, this.valueBuffer[index]);
};

EncoderPage.prototype.sendAllValuesToFaders = function()
{
	for ( var i = 0; i < 8; i++)
	{
		this.sendValueToFader(i);
	}
};

EncoderPage.prototype.setEncoder = function(index, value, mode, indicator)
{
	this.valueBuffer[index] = value;
	t = Math.round(this.valueBuffer[index] * (10 / 16384)) + 1 | (mode << 4) | (indicator << 6);
	this.ledBuffer[index] = t;

	if (mcuActiveEncoderPage === this.pageIndex)
	{
		if (!isFlipOn)
		{
			this.sendValueToVpot(index);
		}
		else
		{
			this.sendValueToFader(index);
		}
	}
	else if (isFlipOn)
		encoderPages[VPOT_PAGE.VOLUME].sendValueToVpot(index);
	else encoderPages[VPOT_PAGE.VOLUME].sendValueToFader(index);
};

//EncoderPage.prototype.setEncoderToDefaultValue = function(index, value, mode, indicator)
//{
//	this.defaultValueBuffer[index] = value;
//	t = Math.round(this.valueBuffer[index] * (10 / 16384)) + 1 | (mode << 4) | (indicator << 6);
//	this.ledBuffer[index] = t;
//
//	if (mcuActiveEncoderPage === this.pageIndex)
//	{
//		if (!isFlipOn)
//		{
//			this.sendValueToVpot(index);
//		}
//		else
//		{
//			this.sendValueToFader(index);
//		}
//	}
//	else if (isFlipOn)
//		encoderPages[VPOT_PAGE.VOLUME].sendValueToVpot(index);
//	else encoderPages[VPOT_PAGE.VOLUME].sendValueToFader(index);
//};

function setEncoderPage(encoderpage)
{
	mcuActiveEncoderPage = encoderpage;
	if (isFlipOn)
	{
		encoderPages[mcuActiveEncoderPage].sendAllValuesToFaders();
		encoderPages[VPOT_PAGE.VOLUME].sendAllValuesToVpots();
	}
	else
	{
		encoderPages[VPOT_PAGE.VOLUME].sendAllValuesToFaders();
		encoderPages[mcuActiveEncoderPage].sendAllValuesToVpots();
	}
}

function getEncoderObjectPath(index)
{
	if (mcuActiveEncoderPage == VPOT_PAGE.TRACK || mcuActiveEncoderPage == VPOT_PAGE.PAN)
	{
		return trackBank.getTrack(index).getPan();
	}
	else if (mcuActiveEncoderPage == VPOT_PAGE.DEVICE_PARAM || mcuActiveEncoderPage == VPOT_PAGE.DEVICE_PRESETS)
	{
		return cursorDevice.getParameter(index);
	}
	else if (mcuActiveEncoderPage == VPOT_PAGE.SEND0)
	{
		return trackBank.getTrack(index).getSend(0);
	}
	else if (mcuActiveEncoderPage == VPOT_PAGE.SEND1)
	{
		return trackBank.getTrack(index).getSend(1);
	}
	else if (mcuActiveEncoderPage == VPOT_PAGE.SEND2)
	{
		return trackBank.getTrack(index).getSend(2);
	}
	else if (mcuActiveEncoderPage == VPOT_PAGE.SEND3)
	{
		return trackBank.getTrack(index).getSend(3);
	}
	else if (mcuActiveEncoderPage == VPOT_PAGE.SEND4)
	{
		return trackBank.getTrack(index).getSend(4);
	}

}
