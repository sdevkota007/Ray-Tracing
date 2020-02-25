const CANVAS_WIDTH = 512;
const CANVAS_HEIGHT = 512;

const script = async () => {
  // Canvas setup
  const canvas = document.getElementById('myCanvas');
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;

  // create WebGL2ComputeRenderingContext
  const context = canvas.getContext('webgl2-compute', {antialias: false});
  if (!context) {
    document.body.className = 'error';
    return;
  }

  // ComputeShader source
  // language=GLSL
  const computeShaderSource = `#version 310 es
  layout (local_size_x = 16, local_size_y = 16, local_size_z = 1) in;
  layout (rgba8, binding = 0) writeonly uniform highp image2D destTex;

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

  void main() {
    ivec2 storePos = ivec2(gl_GlobalInvocationID.xy);
    vec2 norm_coordinates = (vec2(storePos) + vec2(0.5)) / vec2(imageSize(destTex));
    vec2 c = (norm_coordinates - vec2(0.5)) * 2.0 - vec2(1.0, 0.0);

    float n = mandelBrot(c);
    vec4 color = vec4( palette(n), 1.0);

    imageStore(destTex, storePos, color);
  }
  `;

  // create WebGLShader for ComputeShader
  const computeShader = context.createShader(context.COMPUTE_SHADER);
  context.shaderSource(computeShader, computeShaderSource);
  context.compileShader(computeShader);
  if (!context.getShaderParameter(computeShader, context.COMPILE_STATUS)) {
    console.log(context.getShaderInfoLog(computeShader));
    return;
  }

  // create WebGLProgram for ComputeShader
  const computeProgram = context.createProgram();
  context.attachShader(computeProgram, computeShader);
  context.linkProgram(computeProgram);
  if (!context.getProgramParameter(computeProgram, context.LINK_STATUS)) {
    console.log(context.getProgramInfoLog(computeProgram));
    return;
  }

  // create texture for ComputeShader write to
  const texture = context.createTexture();
  context.bindTexture(context.TEXTURE_2D, texture);
  context.texStorage2D(context.TEXTURE_2D, 1, context.RGBA8, CANVAS_WIDTH, CANVAS_HEIGHT);
  context.bindImageTexture(0, texture, 0, false, 0, context.WRITE_ONLY, context.RGBA8);

  // create frameBuffer to read from texture
  const frameBuffer = context.createFramebuffer();
  context.bindFramebuffer(context.READ_FRAMEBUFFER, frameBuffer);
  context.framebufferTexture2D(context.READ_FRAMEBUFFER, context.COLOR_ATTACHMENT0, context.TEXTURE_2D, texture, 0);

  // execute ComputeShader
  context.useProgram(computeProgram);
  context.dispatchCompute(CANVAS_WIDTH / 16, CANVAS_HEIGHT / 16, 1);
  context.memoryBarrier(context.SHADER_IMAGE_ACCESS_BARRIER_BIT);

  // show computed texture to Canvas
  context.blitFramebuffer(
    0, 0, CANVAS_WIDTH, CANVAS_HEIGHT,
    0, 0, CANVAS_WIDTH, CANVAS_HEIGHT,
    context.COLOR_BUFFER_BIT, context.NEAREST);
};

window.addEventListener('DOMContentLoaded', script);
