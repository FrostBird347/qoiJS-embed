// https://stackoverflow.com/a/53817185
async function StartQoiToPng(dataURL, MainElement, EmbedType) {
	const mime = "image/qoi";
	await fetch(dataURL).then( response => response.arrayBuffer().then(buffer => ConvertQoiToPng(buffer, MainElement, EmbedType)) );
}

// https://blog.crimx.com/2017/03/09/get-all-images-in-dom-including-background-en/
function getBgImgs(doc) {
	const srcChecker = /url\(\s*?['"]?\s*?(\S+?)\s*?["']?\s*?\)/i
	return Array.from(
		Array.from(doc.querySelectorAll('*'))
			.reduce((collection, node) => {
				let prop = window.getComputedStyle(node, null)
					.getPropertyValue('background-image')
				let match = srcChecker.exec(prop)
				if (match) {
					collection.add(node)
				}
				return collection
			}, new Set())
	)
}

function ConvertQoiToPng(buffer, MainElement, EmbedType) {
	var RawImage = QOI.decode(buffer);
	var TempCanvas = document.createElement('canvas');
	
	TempCanvas.width  = RawImage.width;
	TempCanvas.height = RawImage.height;
	
	if (TempCanvas.getContext) {
		var TempCanvasCTX = TempCanvas.getContext('2d');
		var TempImageData = TempCanvasCTX.createImageData(RawImage.width, RawImage.height);
		
		// Must define a second index for the decoded qoi image incase there is no alpha channel
		for (var i = 0, ii = 0; i < TempImageData.data.length; i += 4) {
			TempImageData.data[i] = RawImage.data[ii];
			TempImageData.data[i+1] = RawImage.data[ii+1];
			TempImageData.data[i+2] = RawImage.data[ii+2];
			
			// If there is no alpha channel, increment the second index by 3 instead of 4
			if (RawImage.channels == 3) {
				TempImageData.data[i+3] = 255;
				ii += 3;
			} else {
				TempImageData.data[i+3] = RawImage.data[ii+3];
				ii += 4;
			}
		}
		
		TempCanvasCTX.putImageData(TempImageData, 0, 0);
		
		// Don't check again
		MainElement.dataset.LoadAttempts = 1000;
		switch(EmbedType) {
			// Regular images
			case 0:
				MainElement.src = TempCanvas.toDataURL();
				break;
			// Background images
			case 1:
				MainElement.style.backgroundImage = "url('" + TempCanvas.toDataURL() + "')";
				break;
			default:
				console.warn("Unknown EmbedType '" + EmbedType + "', skipping!");
		}
		
	} else {
		console.warn("Can not create a canvas, skipping!");
	}
}

function CheckForQOI() {
	var AllImages = [document.getElementsByTagName('img'), getBgImgs(document)];
	for (var ii = 0; ii < AllImages.length; ii++) {
		var NormalImages = AllImages[ii]
		
		for (var i = 0; i < NormalImages.length; i++) {
			
			var CurrentSRC;
			switch(ii) {
				// Regular images
				case 0:
					CurrentSRC = NormalImages[i].src;
					break;
				// Background images
				case 1:
					try {
						CurrentSRC = NormalImages[i].style.backgroundImage.split('"')[1];
					} catch {
						CurrentSRC = ""
					}
					break;
				default:
					console.warn("Unknown EmbedType '" + ii + "', skipping!");
					return;
			}
			
			try {
				
				if (NormalImages[i].dataset.LoadAttempts == null) {
					NormalImages[i].dataset.LoadAttempts = 0;
				} else if (NormalImages[i].dataset.LoadAttempts < 5 && CurrentSRC.split("?")[0].split(".")[CurrentSRC.split("?")[0].split(".").length - 1].toLowerCase() == "qoi") {
					NormalImages[i].dataset.LoadAttempts++;
					StartQoiToPng(CurrentSRC, NormalImages[i], ii);
				}
				
			// If it fails to parse the image url, treat like any other failure
			} catch {
				NormalImages[i].dataset.LoadAttempts++;
			}
		}
		
	}
}

// Run every 2 seconds for the first 10 seconds, then run once every 10 seconds to improve performance
setTimeout(CheckForQOI, 2000);
setTimeout(CheckForQOI, 4000);
setTimeout(CheckForQOI, 6000);
setTimeout(CheckForQOI, 8000);
setInterval(CheckForQOI, 10000);
