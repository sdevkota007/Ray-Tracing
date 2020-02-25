function MeshSelector(selectorElem, rt, meshData, sr){
	let recordRaySegments = true;
	if (!sr) recordRaySegments = false;

	createOptions();
	render();
	function render(){
		console.log(selectorElem.value);
		jsonValue = meshData[selectorElem.value];
		nTriangles = jsonValue["parts"][0]["vertices"].length/3;;
		console.log("nTriangles: ", nTriangles);
		
		let segmentBundles = rt.rayTracer(jsonValue ,recordRaySegments);
		  if (recordRaySegments)sr.renderer(segmentBundles);
	}
	function createOptions(){
		Object.entries(meshData).forEach(function(e){
			let opt = document.createElement('option');
			opt.innerHTML = e[0];
			opt.value = e[0];
			selectorElem.appendChild(opt);			
		});
		selectorElem.addEventListener('change',render);
	}
}