var list=document.getElementsByClassName("formDiv");
var selector=document.getElementById("editOption");
showForm(selector.options[selector.selectedIndex].value);
function showForm(opt){
	for(let i=0;i<parseInt(opt);i++){
		list[i].style.display="none";
	}
	list[parseInt(opt)].style.display="block";
	for(let i=parseInt(opt)+1;i<list.length;i++){
		list[i].style.display="none";
	}
}
function darkMode(){
	if(document.body.classList=="darkMode"){
		document.getElementById("dmbtn").children[1].style.display="none";
		document.getElementById("dmbtn").children[0].style.display="block";
		document.body.classList="";
	}
	else{
		document.getElementById("dmbtn").children[0].style.display="none";
		document.getElementById("dmbtn").children[1].style.display="block";
		document.body.classList="darkMode";
	}
}
function laserPWMtoSpeed(){
	//var t1=performance.now();
	var gcode=document.getElementById("gcode");
	var lines = gcode.value.split("\n");  //Splits every single line of code in an array of lines.
	var gcodeOut="";
	var exprS = /S([0-9])+/
	var exprG = /G([0-9])+/ 
	var lastG;
	var matchedS;
	var matchedG;
	var maxSpeed=parseInt(document.getElementById("maxSpeed").value);//This is the max feed rate of the engraver: used for the remapping function.
	var minSpeed=parseInt(document.getElementById("minSpeed").value);//This is the min feed rate of the engraver: used for the remapping function.
	var timeMultiplier=document.getElementById("timeMultiplier").value;
	var pauseOn=document.getElementById("pauseOn").value;
	var pauseOff=document.getElementById("pauseOff").value;
	//var skipWhite=document.getElementById("skipWhite").checked;
	var skipWhite=false;
	var output=document.getElementById("finalgcode");
	output.value="";
	var laserOn=false;
	var tempLine;
	var areSettingsOk=true;
	var settingsErrors="";
	if(maxSpeed<=minSpeed){
		settingsErrors+="Maximum feed rate should be a higher number than minimum feed rate.\n";
		areSettingsOk=false;
	}
	if((maxSpeed<=0)||(minSpeed<=0)){
		settingsErrors+="Feed rates should be numbers higher than 0.\n";
		areSettingsOk=false;
	}
	if((pauseOn<0)||(pauseOff<0)){
		settingsErrors+="Pauses must be numbers higher than 0.\n";
		areSettingsOk=false;
	}
	if(timeMultiplier<=0){
		settingsErrors+="Time multiplier must be a number higher than 0.\n";
		areSettingsOk=false;
	}
	if(areSettingsOk){
		for(line of lines){
				matchedS=line.match(exprS);
				matchedG=line.match(exprG);
				if(line.includes("M3")){
					laserOn=true;
					tempLine+="M106 S255\nG4 P"+pauseOn+"\n";
					gcodeOut+=tempLine;
					tempLine="";
					continue;
				}
				else if(line.includes("M5")){
					laserOn=false;
					tempLine+="M107\nG4 P"+pauseOff+"\n";
					gcodeOut+=tempLine;
					tempLine="";
					continue;
				}
				if(matchedG!==null){ //keeps track of the last G command issued, so that it can be inserted in the lines where is missing;
				    if((matchedG[0]==="G0")&&(matchedS!==null)){//fast movements are not needed in grayscale printing
						lastG="G1";
						line=line.replace("G0","G1");
					}
					else{
						lastG=matchedG[0];
					}
				}
				if((line[0]=='X')||(line[0]=='Y')||(line[0]=='Z')){//If line's first letter is X or Y, and there is a S parameter, the script assumes that the G1 code is missing and adds it.
					tempLine+=lastG+" ";
				}
				if(matchedS!==null){ //If there's a S parameter in the line, starts the conversion from PWM to speed-controlled laser engraving.
					if((matchedS[0].includes("S0"))&&((matchedG===null)||(skipWhite))){//If the script encounters a S0 parameter in a line with coordinates, it assumes that the laser should be turned off for that line, and adds M107/M106 commands.
						if(laserOn){//If laser was on, it turns it off with a M107 command, waiting 120ms before moving.
							tempLine+="M107\nG4 P"+pauseOff+"\n";
							laserOn=false;
						}
						tempLine+=line.replace(matchedS[0],""); //Remaps the S parameter from 0 - 255 range to maxSpeed - maxSpeed/10.
						gcodeOut+=tempLine+"\n";
					}
					else{
						if(!laserOn){ //If laser was turned off with a previous S0 parameter, when a S parameter with a value above 0 is read the script adds also a M106 command, waiting 120ms before moving.
							tempLine+="M106 S255\nG4 P"+pauseOn+"\n";
							laserOn=true;
						}
						matchedS=matchedS[0].substr(1); //Extracts the numeric value of the S parameter.
						//alert(-map_range(parseInt(matchedS),1,255,-maxSpeed,-maxSpeed/10));
						tempLine+=line.replace("S"+matchedS,"F"+(map_range(parseInt(matchedS),1,255,-maxSpeed,-minSpeed)/timeMultiplier).toFixed().toString()); //Remaps the S parameter from 0 - 255 range to maxSpeed - maxSpeed/10.
						gcodeOut+=tempLine+"\n";
					}
					
				}
				else{				
					gcodeOut+=line+"\n";
				}
				tempLine="";
		}
		//var t2=performance.now();
		output.value=gcodeOut;
		//console.log("Conversion time: "+(t2-t1)/1000+" seconds");
	}
	else{
		alert(settingsErrors+"\nCorrect your settings and try again.");
	}
	
}
function outlineGRBLtoEnder(){
	//var t1=performance.now();
	var gcode=document.getElementById("gcode");
	var lines = gcode.value.split("\n");  //Splits every single line of code in an array of lines.
	var gcodeOut="";
	var exprS = /S([0-9])+/
	var exprG = /G([0-9])+/ 
	var exprF = /F([0-9])+/ 
	var lastG;
	var matchedS;
	var matchedG;
	var pauseOn=document.getElementById("pauseOnOut").value;
	var pauseOff=document.getElementById("pauseOffOut").value;
	var output=document.getElementById("finalgcode");
	var g0FeedRate;
	output.value="";
	var laserOn=false;
	var tempLine="" ;
	for(line of lines){
			matchedS=line.match(exprS);
			matchedG=line.match(exprG);
			matchedF=line.match(exprF);
			if(line.includes("M3")){
				continue;
			}
			else if(line.includes("M5")){
				continue;
			}
			else if(line.startsWith("S0")){
				laserOn=false;
				tempLine+="M107 S0\nG4 P"+pauseOff+"\n";
				gcodeOut+=tempLine;
				tempLine="";
				continue;
			}
			else if(line.startsWith("S255")){
				laserOn=true;
				tempLine+="M106 S255\nG4 P"+pauseOn+"\n";
				gcodeOut+=tempLine;
				tempLine="";
				continue;
			}
			if(matchedG!==null){ //keeps track of the last G command issued, so that it can be inserted in the lines where is missing;
				lastG=matchedG[0]+" ";
				if((g0FeedRate===undefined)&&(matchedF!==null)){
					console.log("set Feed Rate for G0 to "+g0FeedRate);
					g0FeedRate=matchedF[0];
				}
			}
			if((line[0]=='X')||(line[0]=='Y')||(line[0]=='Z')){//If line's first letter is X or Y, and there is a S parameter, the script assumes that the G1 code is missing and adds it.
				tempLine+=lastG+line;
				if((lastG=="G0")&&(matchedF===null)){
					tempLine+=" "+g0FeedRate;
				}
				gcodeOut+=tempLine+"\n";
				tempLine="";
				continue;
			}
			else{				
				tempLine+=line;
				if((lastG=="G0 ")&&(matchedG!==null)&&(matchedF===null)){
					tempLine+=" "+g0FeedRate;
				}
				gcodeOut+=tempLine+"\n";
				tempLine="";
				continue;
			}
	}
	//var t2=performance.now();
	output.value=gcodeOut;
	//console.log("Conversion time: "+(t2-t1)/1000+" seconds");
}
function map_range(value, low1, high1, low2, high2) {
    return -(low2 + (high2 - low2) * (value - low1) / (high1 - low1));
}


function saveTextAsFile()
{
	if(document.getElementById("finalgcode").value!=""){
		var textToWrite = document.getElementById("finalgcode").value;
		var textFileAsBlob = new Blob([textToWrite], {type:'text/plain'});
		var fileNameToSaveAs = "export.gcode";
		var loadedFileName=document.getElementById("inFile").value;
		if(loadedFileName!=""){
			let rx=/([^\\/"'.])+/g
			let ar=loadedFileName.match(rx);
			fileNameToSaveAs=ar[ar.length-2]+"_edit.gcode";
		}		
		
		

		var downloadLink = document.createElement("a");
		downloadLink.download = fileNameToSaveAs;
		downloadLink.innerHTML = "Download File";
		if (window.webkitURL != null)
		{
			// Chrome allows the link to be clicked
			// without actually adding it to the DOM.
			downloadLink.href = window.webkitURL.createObjectURL(textFileAsBlob);
		}
		else
		{
			// Firefox requires the link to be added to the DOM
			// before it can be clicked.
			downloadLink.href = window.URL.createObjectURL(textFileAsBlob);
			downloadLink.onclick = destroyClickedElement;
			downloadLink.style.display = "none";
			document.body.appendChild(downloadLink);
		}

		downloadLink.click();
	}
}

function destroyClickedElement(event)
{
	document.body.removeChild(event.target);
}

function loadFileAsText()
{
	var fileToLoad = document.getElementById("inFile").files[0];

	var fileReader = new FileReader();
	fileReader.onload = function(fileLoadedEvent) 
	{
		var textFromFileLoaded = fileLoadedEvent.target.result;
		document.getElementById("gcode").value = textFromFileLoaded;
	};
	fileReader.readAsText(fileToLoad, "UTF-8");
	document.getElementById("finalgcode").value="";
}

