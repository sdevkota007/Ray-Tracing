function RayTracer(rtCamera, rtCanvas){
	let windowHeight = 2*Math.tan((Math.PI/180)*(rtCamera.FOV/2)),
	windowWidth = windowHeight*rtCamera.aspect;

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

	// ComputeShader source
		// language=GLSL
	const computeShaderSource = `#version 310 es
		layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;
		layout (rgba8, binding = 0) writeonly uniform highp image2D destTex;

		uniform vec3 eye, U, V, W;
		uniform float rows, cols, winWidth, winHeight;

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

		void main() {
			ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);

			Ray ray = getRay(float(storePos.y), float(storePos.x));

			vec4 color = vec4( ((ray.d + 1.0) /2.0), 1.0);
			//vec4 color = vec4( ray.d , 1.0);


			imageStore(destTex, storePos, color);
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
	let eyeLocation =  gl.getUniformLocation(computeProgram, "eye");
	let uLocation =  gl.getUniformLocation(computeProgram, "U");
	let vLocation =  gl.getUniformLocation(computeProgram, "V"); 
	let wLocation =  gl.getUniformLocation(computeProgram, "W");

	let rowsLocation =  gl.getUniformLocation(computeProgram, "rows"); 
	let colsLocation =  gl.getUniformLocation(computeProgram, "cols");
	let WinWidthLocation =  gl.getUniformLocation(computeProgram, "winWidth"); 
	let WinHeightLocation =  gl.getUniformLocation(computeProgram, "winHeight");

	gl.uniform3fv(eyeLocation,eye);  
	gl.uniform3fv(uLocation,U);
	gl.uniform3fv(vLocation,V);
	gl.uniform3fv(wLocation,W);

	gl.uniform1f(rowsLocation,rows);  
	gl.uniform1f(colsLocation,cols);
	gl.uniform1f(WinWidthLocation, windowWidth);
	gl.uniform1f(WinHeightLocation, windowHeight);


	gl.dispatchCompute(CanvasWidth / 16, CanvasHeight / 16, 1);
	gl.memoryBarrier(gl.SHADER_IMAGE_ACCESS_BARRIER_BIT);

	// show computed texture to Canvas
	gl.blitFramebuffer(
		0, 0, CanvasWidth, CanvasHeight,
		0, 0, CanvasWidth, CanvasHeight,
		gl.COLOR_BUFFER_BIT, gl.NEAREST);

	console.log("finished");
}