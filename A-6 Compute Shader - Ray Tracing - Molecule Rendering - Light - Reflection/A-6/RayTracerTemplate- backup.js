function RayTracer(rtCamera, rtCanvas){
	this.rayTracer=function(moleculeData)
	{
		const Ks = 0.5;
		const shininess = 50.;
		const lightColor = new Float32Array([1.0, 1.0, 1.0]);

		const rtScene = moleculeData.rtScene;
		const box = moleculeData.box;
		const boxMin = new Float32Array( [box.min.x, box.min.y, box.min.z] );
		const boxMax = new Float32Array( [box.max.x, box.max.y, box.max.z] );

		let windowHeight = 2*Math.tan((Math.PI/180)*(rtCamera.FOV/2)),
		windowWidth = windowHeight*rtCamera.aspect;

		const sceneCenter=new THREE.Vector3();
		let sceneSize = new THREE.Vector3();

		box.getCenter(sceneCenter)
		box.getSize(sceneSize);
		let sceneDia = sceneSize.length();
		rtCamera.setEye([sceneCenter.x, sceneCenter.y, sceneCenter.z + sceneDia/1.5]);
		rtCamera.setAt([sceneCenter.x, sceneCenter.y, sceneCenter.z]);


		const eye = new Float32Array([rtCamera.Eye.x, rtCamera.Eye.y, rtCamera.Eye.z]);
		const U = new Float32Array([rtCamera.U.x, rtCamera.U.y, rtCamera.U.z]);
		const V = new Float32Array([rtCamera.V.x, rtCamera.V.y, rtCamera.V.z]);
		const W = new Float32Array([rtCamera.W.x, rtCamera.W.y, rtCamera.W.z]);

		const rows = rtCamera.rows;
		const cols = rtCamera.columns;
		const CanvasWidth = rtCanvas.width;
		const CanvasHeight = rtCanvas.height;

		console.log("starting");

		// create WebGL2ComputeRenderingContext
		const gl = rtCanvas.getContext('webgl2-compute', {antialias: false});
		if (!gl) {
		  document.body.className = 'error';
		  return;
		}


		
		//prepare sphere data to feed into the shared storage buffer
		const sphereSize = 32;

		spheres = rtScene[0]
		nSpheres = spheres.quadruples.length/4;
		const buffer = new ArrayBuffer(nSpheres * sphereSize);
		const data = new Float32Array(buffer);
		const sphereSizeInFloats = sphereSize/4;
		for (let index = 0; index < nSpheres; index++) {
		    data [index*sphereSizeInFloats+0] = spheres.quadruples[index*4];	//center.x
		    data [index*sphereSizeInFloats+1] = spheres.quadruples[index*4+1];	//center.y
		    data [index*sphereSizeInFloats+2] = spheres.quadruples[index*4+2];	//center.z
		    data [index*sphereSizeInFloats+3] = spheres.quadruples[index*4+3];	//radius
		    data [index*sphereSizeInFloats+4] = spheres.color[index*3];			//color.x
		    data [index*sphereSizeInFloats+5] = spheres.color[index*3+1];		//color.y
		    data [index*sphereSizeInFloats+6] = spheres.color[index*3+2];		//color.z
		    data [index*sphereSizeInFloats+7] = 1.0;							//alpha value
		}

		//prepare bounding box data to feed into shader storage buffer
		const boundingBox = new Float32Array( [box.min.x, box.min.y, box.min.z, 
											  box.max.x, box.max.y, box.max.z ]);


		






		// ComputeShader source
		// language=GLSL
		const computeShaderSource = `#version 310 es
			layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;
			layout (rgba8, binding = 0) writeonly uniform highp image2D destTex;

			struct Sphere{
			   vec3 center;
			   float radius;
			   vec3 color;
			};

			layout (std430, binding = 0) readonly buffer SSBO {
				float sceneData[];
			} ssbo;

			layout (std430, binding = 1) readonly buffer SSBO1 {
				float boundingBox[6];
			} ssbo1;

			uniform float Ks;
			uniform float shininess;
			uniform vec3 lightColor;
			uniform vec3 eye, U, V, W;
			uniform float rows, cols, winWidth, winHeight;
			uniform vec3 boxMin, boxMax;			

			int sphereDataSize = 8;
			float INFINITY = 999999999999.0;
			vec3 BLACK = vec3(0.0, 0.0, 0.0);


			float mandelBrot(vec2 C) {
			  vec2 Z = vec2(0.0f,0.0f);
			  for (int i=0; i<256; i++) {
			      Z = vec2( (Z.x * Z.x) - (Z.y * Z.y) + C.x , 2.0f* Z.x * Z.y + C.y );
			      float magnitude = sqrt((Z.x * Z.x) + (Z.y * Z.y));
			      if (magnitude > 4.0f) {
			          // pick a color
			          return float(i)/255.0f;
			      }
			  }
			  return 1.0f;
			}

			// cosine based palette, 4 vec3 params
			vec3 palette( in float t)
			{
			  vec3 a = vec3(0.5, 0.5, 0.5);   
			  vec3 b = vec3(0.5, 0.5, 0.5);
			  vec3 c = vec3(1.0, 1.0, 1.0);
			  vec3 d = vec3(0.50, 0.20, 0.25);
			  return a + b*cos( 6.28318*(c*t+d) );
			}

			struct Ray{
				vec3 o;
				vec3 d;
			};

			// compute ray
			Ray getRay(float row,float col)
			{
				Ray ray;
				float coeffV = (0.5 - (row+0.5)/rows) * winWidth;
				float coeffU = (0.5 - (col+0.5)/cols) * winHeight;
				
				ray.o = eye;
				ray.d = normalize(-1.0 * ( W + coeffU * U + coeffV * V ));

				return ray;
			}

			struct Result{
				bool valid;
				float tmin;
				vec3 color;
				Sphere sp;
			};

			
			Sphere getSphere(int index)
			{
				Sphere sphere;

				sphere.center = vec3(ssbo.sceneData[index*sphereDataSize] ,
									  ssbo.sceneData[index*sphereDataSize + 1] ,
									  ssbo.sceneData[index*sphereDataSize + 2] );

				sphere.radius = ssbo.sceneData[index*sphereDataSize + 3];

				sphere.color  = vec3(ssbo.sceneData[index*sphereDataSize + 4] ,
									 ssbo.sceneData[index*sphereDataSize + 5] ,
									 ssbo.sceneData[index*sphereDataSize + 6] ) ;
				sphere.color = sphere.color /255.0;
				return sphere;
			}


			vec3 sphereNormal(vec3 P, Sphere sp)
			{
				return normalize(P- sp.center);
			}


			vec3 pointOnRay(Ray ray, float t) {
				return vec3(ray.o + t* ray.d);
			}


			//test this
			Result intersectRaySphere(Ray ray, Sphere sp)
			{
				Result result;
				result.valid= false;
				result.tmin = INFINITY; 
				result.color = BLACK ;

				vec3 origin = ray.o;
				vec3 dirVec = ray.d;

				vec3 center = sp.center;
				float radius = sp.radius;

				float A = dot(dirVec, dirVec);

				vec3 OminusC = origin - center;

				float B = 2.0 * dot(dirVec, OminusC);
				float C = dot(OminusC, OminusC) - pow(radius, 2.0);

				float discriminant = pow(B, 2.0) - (4.0 * A * C);

				if (discriminant > 0.0) {
					result.valid = true;

					float t1 = (-B + sqrt(discriminant)) / (2.0 * A); 
					float t2 = (-B - sqrt(discriminant)) / (2.0 * A);

					if (t1<t2) {
						result.tmin = t1;
					}
						
					else {
						result.tmin = t2;
					}
					result.color = sp.color;
					result.sp = sp;
				}

				return result;
			}


			// find out if ray intersects with AABB
			bool intersectAABB(Ray ray, vec3 boxMin, vec3 boxMax, float tmin, float tmax)
			{
				vec3 invD = 1.0/ (ray.d);
				vec3 t0s = (boxMin - ray.o) * invD;
			  	vec3 t1s = (boxMax - ray.o) * invD;
			    
			  	vec3 tsmaller = min(t0s, t1s);
		    	vec3 tbigger  = max(t0s, t1s);
		    
		    	tmin = max(tmin, max(tsmaller[0], max(tsmaller[1], tsmaller[2])));
		    	tmax = min(tmax, min(tbigger[0], min(tbigger[1], tbigger[2])));

				return (tmin < tmax);
			}


			vec3 computeLighting(vec3 pOnRay, Ray ray, Sphere sp)
			{
				
				vec3 spNormal = normalize(sphereNormal(pOnRay, sp));

				vec3 lightVec = normalize(-ray.d);
				vec3 viewVec = normalize(-ray.d);
				vec3 halfVec = normalize(lightVec + viewVec);

				float nDotLight = max(0.0, dot(lightVec, spNormal));  // we do not need the negative value of cosine
				float nDotHalf = max(0.0, dot(halfVec, spNormal));  // we do not need the negative value of cosine

				vec3 materialColorVec = sp.color;
				vec3 lightColorVec = vec3(1.0, 1.0, 1.0);
				

				vec3 diffuseColor = materialColorVec * lightColorVec * nDotLight;

				vec3 specularColor = lightColorVec * pow(nDotHalf, shininess );

				vec3 reflectedColor = (1.0 - Ks) * diffuseColor + Ks * specularColor;
				reflectedColor = clamp( reflectedColor, 0.0, 1.0);

				return reflectedColor;
			}


			Result intersectSpheres(Ray ray)
			{
				int nSpheres = ssbo.sceneData.length()/sphereDataSize;
				Result result;
				result.valid= false;
				result.tmin = INFINITY; 
				result.color = BLACK ;

				for (int index = 0; index < nSpheres; index++)
				{
					Sphere sp = getSphere(index);
					Result returnedResult = intersectRaySphere(ray, sp);
					result.valid = returnedResult.valid;
					float tmin = returnedResult.tmin;

					if (result.valid) {
						if (tmin<result.tmin){
							result.tmin = tmin;
							result.sp = sp;
						}
					}
				}

				return result;
			}

			// bool isUnderShadow()
			// {
			// 	// TODO: complete this later
			// 	return false
			// }

			// bool isReflective(Sphere sp)
			// {
			// 	// TODO: complete this later
			// 	return true
			// }

			// compute color
			vec3 getColor(Ray ray){
				bool intersect = intersectAABB(ray, boxMin, boxMax, 0.0 , INFINITY);
				if (intersect)
				{
					// vec3 color = BLACK;
					// factor = (1,1,1)
					// for (iteration=0; i<maxIterations; i++)
					// {
					// 	(object, point) = nearest_point(ray,scene)
					// 	if ! valid(point)
					// 		break
					// 	if !underShadow(point,scene)
					// 		color += factor*compute_lighting(object, point, ray)
					// 	if (reflective(object))
					// 	{
					// 		ray = reflectionRay(ray,normal at point of Intersection)
					// 		factor = factor*mirrorReflectance(object)
					// 	}
					// 	else break
					// }
					// return color

					// vec3 color = BLACK;
					// float factor[3] = {1,1,1};

					// for (i=0; i<maxIterations; i++)
					// {
					// 	Result result = intersectSpheres(ray);
					// 	if (result.valid)
					// 	{
					// 		if (!isUnderShadow())
					// 		{
					// 			vec3 pOnRay = pointOnRay(ray, result.tmin);
					// 			result.color = computeLighting(pOnRay, ray, result.sp);
					// 		}
					// 		if (isReflective(result.sp))
					// 		{
					// 			ray = reflectionRay(ray, result.sp);
					// 			factor = factor * mirrorReflectance(object);
					// 		}
					// 	}
						
					Result result = intersectSpheres(ray);
					vec3 pOnRay = pointOnRay(ray, result.tmin);
					result.color = computeLighting(pOnRay, ray, result.sp);
					return result.color;

				}

				else
				{
					return BLACK;
				}
			}

		
			void main() {
				ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
				Ray ray = getRay(float(storePos.y), float(storePos.x));

				vec3 color = getColor(ray);
				imageStore(destTex, storePos, vec4(color,1.0));
			}
			`;


		// create WebGLShader for ComputeShader
		const computeShader = gl.createShader(gl.COMPUTE_SHADER);
		gl.shaderSource(computeShader, computeShaderSource);
		gl.compileShader(computeShader);
		if (!gl.getShaderParameter(computeShader, gl.COMPILE_STATUS)) {
		  console.log(gl.getShaderInfoLog(computeShader));
		  return;
		}

		// create WebGLProgram for ComputeShader
		const computeProgram = gl.createProgram();
		gl.attachShader(computeProgram, computeShader);
		gl.linkProgram(computeProgram);
		if (!gl.getProgramParameter(computeProgram, gl.LINK_STATUS)) {
		  console.log(gl.getProgramInfoLog(computeProgram));
		  return;
		}

		// create texture for ComputeShader write to
		const texture = gl.createTexture();
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, CanvasWidth, CanvasHeight);
		gl.bindImageTexture(0, texture, 0, false, 0, gl.WRITE_ONLY, gl.RGBA8);

		// create frameBuffer to read from texture
		const frameBuffer = gl.createFramebuffer();
		gl.bindFramebuffer(gl.READ_FRAMEBUFFER, frameBuffer);
		gl.framebufferTexture2D(gl.READ_FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

		// execute ComputeShader
		gl.useProgram(computeProgram);

		let KsLocation =  gl.getUniformLocation(computeProgram, "Ks");
		let shininessLocation =  gl.getUniformLocation(computeProgram, "shininess");
		let lightColorLocation =  gl.getUniformLocation(computeProgram, "lightColor");
		
		let eyeLocation =  gl.getUniformLocation(computeProgram, "eye");
		let uLocation =  gl.getUniformLocation(computeProgram, "U");
		let vLocation =  gl.getUniformLocation(computeProgram, "V"); 
		let wLocation =  gl.getUniformLocation(computeProgram, "W");

		let rowsLocation =  gl.getUniformLocation(computeProgram, "rows"); 
		let colsLocation =  gl.getUniformLocation(computeProgram, "cols");
		let WinWidthLocation =  gl.getUniformLocation(computeProgram, "winWidth"); 
		let WinHeightLocation =  gl.getUniformLocation(computeProgram, "winHeight");

		let boxMinLocation =  gl.getUniformLocation(computeProgram, "boxMin");
		let boxMaxLocation =  gl.getUniformLocation(computeProgram, "boxMax");

		gl.uniform1f(KsLocation,Ks);  
		gl.uniform1f(shininessLocation,shininess);
		gl.uniform3fv(lightColorLocation,lightColor);

		gl.uniform3fv(eyeLocation,eye);  
		gl.uniform3fv(uLocation,U);
		gl.uniform3fv(vLocation,V);
		gl.uniform3fv(wLocation,W);

		gl.uniform1f(rowsLocation,rows);  
		gl.uniform1f(colsLocation,cols);
		gl.uniform1f(WinWidthLocation, windowWidth);
		gl.uniform1f(WinHeightLocation, windowHeight);

		gl.uniform3fv(boxMinLocation, boxMin);
		gl.uniform3fv(boxMaxLocation, boxMax);



		///////////
		// create ShaderStorageBuffer
		let buffer_id = gl.createBuffer();
		gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, buffer_id);
		gl.bufferData(gl.SHADER_STORAGE_BUFFER, data, gl.STATIC_COPY); // last argument: usage
		gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 0, buffer_id);
		// where 0 is the storageBuffer Unit of the GPU
		// It is specified in the layout of the Shader program.

		// create ShaderStorageBuffer
		// console.log(boundingBox);
		// let buffer_id = gl.createBuffer();
		// gl.bindBuffer(gl.SHADER_STORAGE_BUFFER, buffer_id);
		// gl.bufferData(gl.SHADER_STORAGE_BUFFER, boundingBox, gl.STATIC_COPY); // last argument: usage
		// gl.bindBufferBase(gl.SHADER_STORAGE_BUFFER, 1, buffer_id);
		



		gl.dispatchCompute(CanvasWidth / 16, CanvasHeight / 16, 1);
		gl.memoryBarrier(gl.SHADER_IMAGE_ACCESS_BARRIER_BIT);

		// show computed texture to Canvas
		gl.blitFramebuffer(
			0, 0, CanvasWidth, CanvasHeight,
			0, 0, CanvasWidth, CanvasHeight,
			gl.COLOR_BUFFER_BIT, gl.NEAREST);

		console.log("finished");
	}	
}