function RayTracer(rtCamera, rtCanvas){
	this.rayTracer=function(meshObj)
	{
		const Ks = 0.5;
		const shininess = 50.;
		const lightColor = new Float32Array([1.0, 1.0, 1.0]);

		const boxMinV3 = new THREE.Vector3(meshObj.box.min[0], meshObj.box.min[1], meshObj.box.min[2]);
		const boxMaxV3 = new THREE.Vector3(meshObj.box.max[0], meshObj.box.max[1], meshObj.box.max[2]);
		const box = new THREE.Box3(boxMinV3, boxMaxV3);
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


		//prepare mesh data to feed into the shared storage buffer
		const buffer = meshObj.parts[0].vertices.concat(meshObj.parts[0].normals)
		const data = new Float32Array(buffer);

		//prepare bounding box data to feed into shader storage buffer
		const boundingBox = new Float32Array( [box.min.x, box.min.y, box.min.z, 
											  box.max.x, box.max.y, box.max.z ]);


		// ComputeShader source
		// language=GLSL
		const computeShaderSource = `#version 310 es
			layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;
			layout (rgba8, binding = 0) writeonly uniform highp image2D destTex;

			struct Triangle{
			   vec3 p1;
			   vec3 p2;
			   vec3 p3;
			   vec3 n1;
			   vec3 n2;
			   vec3 n3;
			};

			layout (std430, binding = 0) readonly buffer SSBO {
				float sceneData[];
			} ssbo;

			// layout (std430, binding = 1) readonly buffer SSBO1 {
			// 	float boundingBox[6];
			// } ssbo1;

			uniform float Ks;
			uniform float shininess;
			uniform vec3 lightColor;
			
			uniform vec3 eye, U, V, W;
			uniform float rows, cols, winWidth, winHeight;
			uniform vec3 boxMin, boxMax;			

			vec3 lightPos = vec3(1.0, 0.0, 2);
			const int triangleDataSize = 9;
			const int normalDataSize = 9;
			const float INFINITY = 1.0 / 0.0;
			const vec3 BLACK = vec3(0.0, 0.0, 0.0);
			const int MAXITERATIONS = 1;
			const float FACTOR[3] = float[3](1.0 , 0.6,  0.4 );

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
				Triangle tr;
				float u;
				float v;
				float w;
			};

			
			Triangle getTriangle(int index)
			{
				Triangle triangle;
				int normals_starting_index = ssbo.sceneData.length()/2;

				triangle.p1 = vec3(ssbo.sceneData[index*triangleDataSize] ,
									  ssbo.sceneData[index*triangleDataSize + 1] ,
									  ssbo.sceneData[index*triangleDataSize + 2] );

				triangle.p2 = vec3(ssbo.sceneData[index*triangleDataSize + 3] ,
									  ssbo.sceneData[index*triangleDataSize + 4] ,
									  ssbo.sceneData[index*triangleDataSize + 5] );

				triangle.p3  = vec3(ssbo.sceneData[index*triangleDataSize + 6] ,
									  ssbo.sceneData[index*triangleDataSize + 7] ,
									  ssbo.sceneData[index*triangleDataSize + 8] );
				


				triangle.n1 = vec3(ssbo.sceneData[normals_starting_index + index*normalDataSize] ,
									  ssbo.sceneData[normals_starting_index + index*normalDataSize + 1] ,
									  ssbo.sceneData[normals_starting_index + index*normalDataSize + 2] );

				triangle.n2 = vec3(ssbo.sceneData[normals_starting_index + index*normalDataSize + 3] ,
									  ssbo.sceneData[normals_starting_index + index*normalDataSize + 4] ,
									  ssbo.sceneData[normals_starting_index + index*normalDataSize + 5] );

				triangle.n3  = vec3(ssbo.sceneData[normals_starting_index + index*normalDataSize + 6] ,
									  ssbo.sceneData[normals_starting_index + index*normalDataSize + 7] ,
									  ssbo.sceneData[normals_starting_index + index*normalDataSize + 8] );
				return triangle;
			}


			vec3 triangleNormal(vec3 n1, vec3 n2, vec3 n3, float u, float v, float w)
			{
				return normalize(u*n1 + v*n2 + w*n3);
			}



			//test this
			Result intersectRayTriangle(Ray ray, Triangle tr)
			{
				Result result;
				result.valid= false;
				result.tmin = INFINITY; 

				vec3 o = ray.o;
				vec3 d = ray.d;

				vec3 A = o - tr.p1;
				vec3 B = tr.p2 - tr.p1;
				vec3 C = tr.p3 - tr.p1;

				float v = dot(cross(A, d), C) / dot(cross(B, d), C);
				float w = dot(cross(A, B), d) / dot(cross(C, B), d);
				float t = dot(cross(A, C), B) / dot(cross(d, B), C);

				float u = 1.0-v-w;

				if ( (0.0<=u) && (u<=1.0) && (0.0<=v) && (v<=1.0) && (0.0<=w) && (w<=1.0) )
				{
					result.valid = true;
					result.tmin = t;
					result.tr = tr;
					result.u = u;
					result.v = v;
					result.w = w;
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


			vec3 computeLighting(Ray ray, vec3 trNormal)
			{

				// TODO: use the lightPos as light vector later, for now use negative ray dirVec
				vec3 lightVec = normalize(-ray.d);
				// vec3 lightVec = lightPos;

				vec3 viewVec = normalize(-ray.d);
				vec3 halfVec = normalize(lightVec + viewVec);

				float nDotLight = max(0.0, dot(lightVec, trNormal));  // we do not need the negative value of cosine
				float nDotHalf = max(0.0, dot(halfVec, trNormal));  // we do not need the negative value of cosine

				// TODO: use different material color later, for now use normals as color to see a colorful teapot
				// vec3 materialColorVec = vec3(0.5, 0.5, 0.0);
				vec3 materialColorVec = trNormal;
				
				vec3 lightColorVec = vec3(1.0, 1.0, 1.0);

				vec3 diffuseColor = materialColorVec * lightColorVec * nDotLight;

				vec3 specularColor = lightColorVec * pow(nDotHalf, shininess);

				vec3 reflectedColor = (1.0 - Ks) * diffuseColor + Ks * specularColor;
				reflectedColor = clamp( reflectedColor, 0.0, 1.0);

				return reflectedColor;
			}


			Result intersectTriangles(Ray ray)
			{
				// sceneData is combination of vertices and normals, 3 vertices constitute a triangle 
				// and 3 points constitute a vertex
				int nTriangles = ssbo.sceneData.length()/2*3*3; 
				Result result;
				result.valid= false;
				result.tmin = INFINITY; 

				for (int index = 0; index < nTriangles; index++)
				{
					Triangle tr = getTriangle(index);

					Result returnedResult = intersectRayTriangle(ray, tr);
					bool valid = returnedResult.valid;
					float tmin = returnedResult.tmin;

					if (valid) {
						if (tmin<result.tmin){
							result = returnedResult;
						}
					}
				}

				return result;
			}

			bool isUnderShadow()
			{
				// TODO: complete this later
				return false;
			}

			bool isReflective(Triangle tr)
			{
				// TODO: Consider all triangles are reflective for now
				return true;
			}
			
			vec3 reflectionRay(vec3 I, vec3 N)
			{
				vec3 R = I - 2.0 * dot(N, I) * N;
				return -R;
			}

			// compute color
			vec3 getColor(Ray ray)
			{
				bool intersect = intersectAABB(ray, boxMin, boxMax, 0.0 , INFINITY);
				vec3 color = BLACK;
				if (intersect)
				{
					Result result;
					result = intersectTriangles(ray);
					if ( result.valid )
				 	{
			 			vec3 trNormal = normalize(triangleNormal(result.tr.n1, result.tr.n2, result.tr.n3,
			 													 result.u, result.v, result.w));
			 			color = computeLighting(ray, trNormal);
					}	 	
				}
				return color;
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
		   console.log("Error in complilation");
		   console.log(gl.getShaderInfoLog(computeShader));
		   computeShaderSource.split(/\r\n|\n|\r/).forEach(function(s,i){console.log((i+1)+":"+s);});
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