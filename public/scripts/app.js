// Copyright 2019 Peguet Jean-Hugues

(function() {
	'use strict';
	var app = {
		isLoading: true,
		ready: false,
		usedIPs: [],
		spinner: document.querySelector('.loader'),
		ConnectStartButton: document.querySelector('.ConnectStartButton'),
		IpToSendDataTo: document.querySelector('.IP_to_send_data_to'),
		IpToSendDataToDatalist: document.querySelector('#IP_to_send_data_to_Datalist'),
		postServerConnexionOK: true,
		counter: 0
	};
	
	function addInput(value) {
		var optionHTML = "";
		optionHTML += "<option value='" + value + "'>" + value + "</option>";
		app.IpToSendDataToDatalist.innerHTML += optionHTML;
	}
	
	/************************************************************************
	* NOTE: I've used localStorage.
	*   localStorage is a synchronous API and has serious performance
	*   implications. It should not be used in production applications!
	*   Instead, replace by IDB (https://www.npmjs.com/package/idb) or
	*   SimpleDB (https://gist.github.com/inexorabletash/c8069c042b734519680c)
	************************************************************************/

	app.saveUsedIPs = function() {
		var usedIPs = JSON.stringify(app.usedIPs);
		localStorage.usedIPs_v1 = usedIPs;
	};

	app.usedIPs = localStorage.usedIPs_v1;
	if (app.usedIPs) {
		app.usedIPs = JSON.parse(app.usedIPs);
		app.usedIPs.forEach(function(ipObject) {
			addInput([ipObject.ip]);
		});
	} else {
		// The user is using the app for the first time
		app.usedIPs = [ {ip: "192.168.1.34:8888"} ];
		app.usedIPs.forEach(function(ipObject) {
			addInput([ipObject.ip]);
		});
		app.saveUsedIPs();
	}

	/*****************************************************************************
	*
	* Event listeners for UI elements
	*
	****************************************************************************/

	app.ConnectStartButton.addEventListener('click', function() {
		var ip = app.IpToSendDataTo.value;
		if(ip && ip != ""){
			app.spinner.removeAttribute('hidden');
			console.log(ip);
			app.postServerConnexionOK = true;
			app.ready = true;
			app.sendMotionData();
		}
	});
  
	app.sendMotionData = function() {
		var url = 'http://' + app.IpToSendDataTo.value + "/SmartphoneData.py";
		document.getElementById('Sending_to_IP_and_Port').innerHTML = url;
		var http = new XMLHttpRequest();
		var params = 'name=VersionOfMarioFamilyApp_0.0.1&moAccelGrav=' + document.getElementById('moAccelGrav').innerHTML;
		http.open('POST', url, true);

		// // Send the proper header information along with the request
		// http.setRequestHeader('Content-type', 'application/x-www-form-urlencoded');
		// http.setRequestHeader("Connection", "keep-alive"); // JH : not needed since it is the default value ?

		http.onreadystatechange = function() {//Call a function when the state changes.
			app.spinner.setAttribute('hidden', true);
			if(http.readyState === 4 && http.status === 200) { // includes : request.readyState === XMLHttpRequest.DONE (4)
				alert(http.responseText);
			} else {
				if(app.postServerConnexionOK){
					alert("error: no server available at URL: " + url);
					app.postServerConnexionOK = false;
				}
			}
		}
		http.send(params);
	};

	/************************************************************************
	*
	* Code required to start the app
	*
	************************************************************************/

	if ('serviceWorker' in navigator) {
		navigator.serviceWorker
			.register('./service-worker.js')
			.then(function() { console.log('Service Worker Registered'); });
	}
	
	if ('LinearAccelerationSensor' in window && 'Gyroscope' in window && app.ready) {
		document.getElementById('moApi').innerHTML = 'Generic Sensor API';
		let lastReadingTimestamp;
		let accelerometer = new LinearAccelerationSensor();
		accelerometer.addEventListener('reading', e => {
			if (lastReadingTimestamp) {
				intervalHandler(Math.round(accelerometer.timestamp - lastReadingTimestamp));
			}
			lastReadingTimestamp = accelerometer.timestamp
			accelerationHandler(accelerometer, 'moAccel');
		});
		accelerometer.start();
		if ('GravitySensor' in window) {
			let gravity = new GravitySensor();
			gravity.addEventListener('reading', e => accelerationHandler(gravity, 'moAccelGrav'));
			gravity.start();
		}
		let gyroscope = new Gyroscope();
		gyroscope.addEventListener('reading', e => rotationHandler({
			alpha: gyroscope.x,
			beta: gyroscope.y,
			gamma: gyroscope.z
		}));
		gyroscope.start();
	} else if ('DeviceMotionEvent' in window) {
		document.getElementById('moApi').innerHTML = 'Device Motion API';
	  
		var onDeviceMotion = function (eventData) {
			if(app.ready){
				app.counter = app.counter + 1;
				var slowFactor = 20;
				if (app.counter == slowFactor){
					accelerationHandler(eventData.acceleration, 'moAccel');
					accelerationHandler(eventData.acceleration, 'moAccelGrav');
					rotationHandler(eventData.rotationRate);
					intervalHandler(eventData.interval * slowFactor);
					app.counter = 0;
				}
			}
		}
		window.addEventListener('devicemotion', onDeviceMotion, false);
	} else {
		document.getElementById('moApi').innerHTML = 'No Accelerometer & Gyroscope API available';
	}

	function accelerationHandler(acceleration, targetId) {
		var info, xyz = "[X, Y, Z]";
		info = xyz.replace("X", acceleration.x && acceleration.x.toFixed(1));
		info = info.replace("Y", acceleration.y && acceleration.y.toFixed(1));
		info = info.replace("Z", acceleration.z && acceleration.z.toFixed(1));
		document.getElementById(targetId).innerHTML = info;
	}

	function rotationHandler(rotation) {
		var info, xyz = "[X, Y, Z]";
		info = xyz.replace("X", rotation.alpha && rotation.alpha.toFixed(1));
		info = info.replace("Y", rotation.beta && rotation.beta.toFixed(1));
		info = info.replace("Z", rotation.gamma && rotation.gamma.toFixed(1));
		document.getElementById("moRotation").innerHTML = info;
	}

	function intervalHandler(interval) {
		document.getElementById("moInterval").innerHTML = interval + ' / ' + app.counter;
	}
	
	if (app.isLoading) {
		app.spinner.setAttribute('hidden', true);
		app.isLoading = false;
    }
}
)();
