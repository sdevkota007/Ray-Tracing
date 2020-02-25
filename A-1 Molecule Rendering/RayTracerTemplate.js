function RayTracer(rtCamera,rtContext,rtImgData){
	this.rayTracer=function(moleculeData)
	{
		const Ks = 0.5;
		const shininess = 50.;
		const rtScene = moleculeData.rtScene;
		const box = moleculeData.box;

		let primary_vs = [];
		let sphere_vs = [];

		const sceneCenter=new THREE.Vector3();
		let sceneSize = new THREE.Vector3();

		box.getCenter(sceneCenter)
		box.getSize(sceneSize);
		let sceneDia = sceneSize.length();
		rtCamera.setEye([sceneCenter.x, sceneCenter.y, sceneCenter.z + sceneDia/1.5]);
		rtCamera.setAt([sceneCenter.x, sceneCenter.y, sceneCenter.z]);

		let windowHeight = 2*Math.tan((Math.PI/180)*(rtCamera.FOV/2)),
		windowWidth = windowHeight*rtCamera.aspect,
		pixelW = windowWidth/rtCamera.columns, 
		pixelH = windowHeight/rtCamera.rows;
		let rowFactor = Math.floor(rtCamera.rows/8), 
		colFactor = Math.floor(rtCamera.columns/8);

		const eye = rtCamera.Eye;
		const U = rtCamera.U;
		const V = rtCamera.V;
		const W = rtCamera.W;
		console.log("starting");
		for (let row = 0, imgDataIndex=0; row < rtCamera.rows; row++) {
			for (let col = 0; col < rtCamera.columns; col++,imgDataIndex+=4) {
				
				let ray= getRay(rtCamera, row, col);
				//console.log(ray)
				let color = getColor(ray, rtScene);
				
				rtImgData.data[imgDataIndex+0] = Math.round(color[0]);
				rtImgData.data[imgDataIndex+1] = Math.round(color[1]);
				rtImgData.data[imgDataIndex+2] = Math.round(color[2]);
				rtImgData.data[imgDataIndex+3] = 255;
			}
		}
		console.log("finished");
		rtContext.putImageData(rtImgData, 0,0);
				
		function getColor(ray, scene){
			let color = [0,0,0];
			let tMin = 1e10; // A very large value
			
			scene.forEach(function(sceneElement){ // Scene can be an array of arrays. At the moment it is an array or 1 array of spheres.
				let result = intersectSpheres(ray,sceneElement);
				if (result) {
					if (tMin > result.tMin){
						color = result.color;
						tMin = result.tMin;
					}
				}
			});
			return color;
		}

		function getRay(camera, row, col){
				let ray = {O: undefined, d: undefined};
				//
				//var a = new THREE.Vector3(0,1,0)
				rows = camera.rows
				cols = camera.columns

				coeffV = (0.5 - (row+0.5)/rows) * windowHeight
				coeffU = (0.5 - (col+0.5)/cols) * windowWidth

				var dirVec = new THREE.Vector3(0,0,0)
				dirVec.addVectors( V.clone().multiplyScalar(coeffV) , U.clone().multiplyScalar(coeffU));
				dirVec.addVectors(dirVec, W)

				ray.O = camera.Eye
				ray.d = dirVec.clone().negate().normalize()
				//ray.d = dirVec.normalize()

				return ray;
		}
		function intersectSpheres(ray,spheres) {
			let nSpheres = spheres.quadruples.length;
			let result = { // A dummy result
				color : [128,0,128],
				tMin: 1e10
			};
			// you may use the function 
			// getSphere(spheres,index) 
			//to extract a sphere from the spheres data structure
			
			// intersection with every sphere.
			// if there are one or more intersections then find the intersection with nearest "t"
			// Compute color at that intersection point.
			// Note: Each sphere has a material color
			//       you may use getSphereMaterialColor(spheres,index) to get material color as an array of 3 elements.

			nearestPointFound = false;
			for (index = 0; index < nSpheres; index++) {
				//console.log(index, nSpheres)
				sp = getSphere(spheres, index);
				returned_arr  = intersectRaySphere(ray, sp);
				var valid = returned_arr[0];
				var tmin = returned_arr[1];

				if (valid) {
					if (tmin<result.tMin){
						//console.log("result.tMin: ", result.tmin)
						nearestSphereIndex = index
						nearestPointFound = true
						result.tMin = tmin;
					}
				}
				
			}
			if (nearestPointFound) {
				result.color = getSphereMaterialColor(spheres,nearestSphereIndex);
				//console.log("color:", result.color, nearestSphereIndex)

				//var pOnRay = pointOnRay(ray, tmin)
				return result;
			}
			else{
				return result;
			}
			
		}

		function sphereNormal(P, sp){
			// Returns a normalized normal vector at point P on the sphere surface
			return p.clone().sub(sp.center).normalize();
		}
		
		function getSphere(spheres, index){
			// Returns sphere as an object with the following properties
			// 	center: Vector3
			// 	radius: float
			let offset = index*4;
			let sp = {
				center: new THREE.Vector3().fromArray(spheres.quadruples,offset),
				radius: spheres.quadruples[offset+3]
			};
			return sp;
		}
		
		function getSphereMaterialColor(spheres, index){
			// Returns sphere color as an array of 3 elements with values between 0 and 255.
			let offset = index*3;
			return spheres.color.slice(offset,offset+3)
		}
		
		function intersectRaySphere(ray, sp) { // Parameters: ray, Sphere {center,radius}
			// write code here
			var valid = false;

			var origin = ray.O;
			var dirVec = ray.d;


			var center = sp.center;
			var radius = sp.radius;

			var A = dirVec.dot(dirVec);
			var OminusC = new THREE.Vector3(0,0,0);
			OminusC.subVectors(origin, center);
			var B = 2* OminusC.dot(dirVec);
			var C = OminusC.dot(OminusC) - Math.pow(radius, 2);

			discriminant = Math.pow(B, 2) - (4 * A * C);

			//console.log(A,B,C);

			if (discriminant > 0) {
				valid = true;
				//console.log("this is valid")
				var t1 = (-1 * B + Math.sqrt(discriminant)) / (2 * A); 
				var t2 = (-1 * B - Math.sqrt(discriminant)) / (2 * A);

				//console.log(t1, t2);

				if (t1<t2) {
					tmin = t1;
				}
					
				else {
					tmin = t2;
				}
			}

			else {
				valid=false;
				tmin = 1e10;
			}
				

			return [valid, tmin]

		}

		function pointOnRay(ray, t) {
			// write code here
			origin = ray.O;
			dirVec = ray.d;
			p = origin.add(dirVec.clone().multiplyScalar(t));

			//console.log("origin:", origin)
			//console.log("p:", p)
			
			return p
		}
	}
}