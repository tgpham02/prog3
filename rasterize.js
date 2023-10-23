88% of storage used … If you run out, you won't have enough storage to create, edit, and upload files. Get 100 GB of storage for $1.99 $0.49/month for 3 months.
/* GLOBAL CONSTANTS AND VARIABLES */

/* assignment specific globals */
const WIN_Z = 0;  // default graphics window z coord in world space
const WIN_LEFT = 0; const WIN_RIGHT = 1;  // default left and right x coords in world space
const WIN_BOTTOM = 0; const WIN_TOP = 1;  // default top and bottom y coords in world space
const INPUT_TRIANGLES_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // triangles file loc
const INPUT_ELLIPSOIDS_URL = "https://ncsucgclass.github.io/prog2/triangles.json"; // ellipsoids file loc

// const INPUT_TRIANGLES_URL = "triangles.json"; // triangles file loc
// const INPUT_ELLIPSOIDS_URL = "ellipsoids.json"; // ellipsoids file loc


var Eye = new vec4.fromValues(0.5,0.5,-0.5,1.0); // default eye position in world space

/* webgl globals */
var gl = null; // the all powerful gl object. It's all here folks!
var vertexBuffer; // this contains vertex coordinates in triples
var triangleBuffer; // this contains indices into vertexBuffer in triples
var triBufferSize = 0; // the number of indices in the triangle buffer
var vertexPositionAttrib; // where to put position for vertex shader
var vertexColorAttrib; // where to put color for vertex shader

// ASSIGNMENT HELPER FUNCTIONS

// get the JSON file from the passed URL
function getJSONFile(url,descr) {
    try {
        if ((typeof(url) !== "string") || (typeof(descr) !== "string"))
            throw "getJSONFile: parameter not a string";
        else {
            var httpReq = new XMLHttpRequest(); // a new http request
            httpReq.open("GET",url,false); // init the request
            httpReq.send(null); // send the request
            var startTime = Date.now();
            while ((httpReq.status !== 200) && (httpReq.readyState !== XMLHttpRequest.DONE)) {
                if ((Date.now()-startTime) > 3000)
                    break;
            } // until its loaded or we time out after three seconds
            if ((httpReq.status !== 200) || (httpReq.readyState !== XMLHttpRequest.DONE))
                throw "Unable to open "+descr+" file!";
            else
                return JSON.parse(httpReq.response); 
        } // end if good params
    } // end try    
    
    catch(e) {
        console.log(e);
        return(String.null);
    }
} // end get input json file

// set up the webGL environment
function setupWebGL() {

    // Get the canvas and context
    var canvas = document.getElementById("myWebGLCanvas"); // create a js canvas
    gl = canvas.getContext("webgl"); // get a webgl object from it
    
    try {
      if (gl == null) {
        throw "unable to create gl context -- is your browser gl ready?";
      } else {
        gl.clearColor(0.0, 0.0, 0.0, 1.0); // use black when we clear the frame buffer
        gl.clearDepth(1.0); // use max when we clear the depth buffer
        gl.enable(gl.DEPTH_TEST); // use hidden surface removal (with zbuffering)
      }
    } // end try
    
    catch(e) {
      console.log(e);
    } // end catch
 
} // end setupWebGL

// read triangles in, load them into webgl buffers
function loadTriangles() {
    var inputTriangles = getJSONFile(INPUT_TRIANGLES_URL,"triangles");

    if (inputTriangles != String.null) { 
        var whichSetVert; // index of vertex in current triangle set
        var whichSetTri; // index of triangle in current triangle set
        var coordArray = []; // 1D array of vertex coords for WebGL
        var normalsArray = [];  // Array for storing normals
        var indexArray = []; // 1D array of vertex indices for WebGL
        var vtxBufferSize = 0; // the number of vertices in the vertex buffer
        var vtxToAdd = []; // vtx coords to add to the coord array
        var indexOffset = vec3.create(); // the index offset for the current set
        var triToAdd = vec3.create(); // tri indices to add to the index array
        var colorArr = [];
        var ambientArr = [];
        var specularArr = [];
        var shiny = [];
        
        for (var whichSet=0; whichSet<inputTriangles.length; whichSet++) {
            vec3.set(indexOffset,vtxBufferSize,vtxBufferSize,vtxBufferSize); // update vertex offset
            var material = inputTriangles[whichSet].material;
            var ambientColor = material.ambient;
            var diffuseColor = material.diffuse;
            var specularColor = material.specular;
            var shininess = material.n;

            // set up the vertex coord array
            for (whichSetVert=0; whichSetVert<inputTriangles[whichSet].vertices.length; whichSetVert++) {
                vtxToAdd = inputTriangles[whichSet].vertices[whichSetVert];
                var normal = inputTriangles[whichSet].normals[whichSetVert];
                coordArray.push(vtxToAdd[0],vtxToAdd[1],vtxToAdd[2]);
                normalsArray.push(normal[0], normal[1], normal[2]);
                colorArr.push(diffuseColor[0], diffuseColor[1], diffuseColor[2]);
                ambientArr.push(ambientColor[0], ambientColor[1], ambientColor[2]);
                specularArr.push(specularColor[0], specularColor[1], specularColor[2]);
                shiny.push(shininess, shininess, shininess);
            } // end for vertices in set
            
            // set up the triangle index array, adjusting indices across sets
            for (whichSetTri=0; whichSetTri<inputTriangles[whichSet].triangles.length; whichSetTri++) {
                vec3.add(triToAdd,indexOffset,inputTriangles[whichSet].triangles[whichSetTri]);
                indexArray.push(triToAdd[0],triToAdd[1],triToAdd[2]);
            } // end for triangles in set

            vtxBufferSize += inputTriangles[whichSet].vertices.length; // total number of vertices
            triBufferSize += inputTriangles[whichSet].triangles.length; // total number of tris
        } // end for each triangle set 
        triBufferSize *= 3; // now total number of indices

        // send the vertex coords to webGL
        vertexBuffer = gl.createBuffer(); // init empty vertex coord buffer
        gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(coordArray),gl.STATIC_DRAW); // coords to that buffer
        
        // send the vertex colors to webGL
        colorBuffer = gl.createBuffer(); // init empty vertex color buffer
        gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer); // activate that buffer
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colorArr), gl.STATIC_DRAW); // colors to that buffer

        // send the triangle indices to webGL
        triangleBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(indexArray),gl.STATIC_DRAW); // indices to that buffer

        // send the triangle indices to webGL
        normalBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, normalBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(normalsArray),gl.STATIC_DRAW); // indices to that buffer

        // send the triangle indices to webGL
        ambientBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ambientBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(ambientArr),gl.STATIC_DRAW); // indices to that buffer

        // send the triangle indices to webGL
        specularBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, specularBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(specularArr),gl.STATIC_DRAW); // indices to that buffer

        // send the triangle indices to webGL
        shinyBuffer = gl.createBuffer(); // init empty triangle index buffer
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, shinyBuffer); // activate that buffer
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,new Uint16Array(shiny),gl.STATIC_DRAW); // indices to that buffer
    } // end if triangles found
} // end load triangles



function setupShaders() {
    
    // define fragment shader in essl using es6 template strings
    // var fShaderCode = `
    //     precision mediump float;
    //     varying vec3 fragColor;
    //     void main(void) {
    //         gl_FragColor = vec4(fragColor, 1.0); // use the color passed from the vertex shader
    //     }
    // `;
    
    var fShaderCode = `
         precision mediump float;
         varying vec3 fragColor;
         varying vec3 fragNormal;
         varying vec3 fragLightDir;
         varying vec3 fragViewDir;
         uniform vec3 materialAmbient;
         uniform vec3 materialDiffuse;
         uniform vec3 materialSpecular;
         uniform float materialShininess;
         uniform vec3 lightPosition;

         void main(void) {
             vec3 ambient = materialAmbient;
             vec3 normal = normalize(fragNormal);
             vec3 lightDir = normalize(fragLightDir);
             vec3 viewDir = normalize(fragViewDir);
             vec3 diffuse = materialDiffuse * max(dot(normal, lightDir), 0.0);
             vec3 reflection = reflect(-lightDir, normal);
             vec3 specular = materialSpecular * pow(max(dot(reflection, viewDir), 0.0), materialShininess);
             vec3 lighting = ambient + diffuse + specular;
             gl_FragColor = vec4(fragColor * lighting, 1.0);
         }
    `;

    // define vertex shader in essl using es6 template strings
    var vShaderCode = `
        attribute vec3 vertexPosition;
        attribute vec3 vertexColor;
        attribute vec3 vertexNormal; 
        varying vec3 fragColor;
        varying vec3 fragNormal;
        varying vec3 fragLightDir;
        varying vec3 fragViewDir;
        uniform vec3 lightPosition; 
        uniform vec3 cameraPosition; 
        uniform vec3 materialAmbient;
        uniform vec3 materialDiffuse;
        uniform vec3 materialSpecular;
        uniform float materialShininess;

        void main(void) {
            gl_Position = vec4(vertexPosition, 1.0);
            fragColor = vertexColor;
            fragNormal = normalize(vertexNormal); // Pass normalized normal to fragment shader
            fragLightDir = normalize(lightPosition - vertexPosition); 
            fragViewDir = normalize(cameraPosition - vertexPosition); 
        }
    `;

    try {
        // console.log("fragment shader: "+fShaderCode);
        var fShader = gl.createShader(gl.FRAGMENT_SHADER); // create frag shader
        gl.shaderSource(fShader, fShaderCode); // attach code to shader
        gl.compileShader(fShader); // compile the code for GPU execution

        // console.log("vertex shader: "+vShaderCode);
        var vShader = gl.createShader(gl.VERTEX_SHADER); // create vertex shader
        gl.shaderSource(vShader, vShaderCode); // attach code to shader
        gl.compileShader(vShader); // compile the code for GPU execution
        
       
        if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) { // bad frag shader compile
            throw "error during fragment shader compile: " + gl.getShaderInfoLog(fShader);  
            gl.deleteShader(fShader);
        } else if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) { // bad vertex shader compile
            throw "error during vertex shader compile: " + gl.getShaderInfoLog(vShader);  
            gl.deleteShader(vShader);
        } else { // no compile errors
            var shaderProgram = gl.createProgram(); // create the single shader program
            gl.attachShader(shaderProgram, fShader); // put frag shader in program
            gl.attachShader(shaderProgram, vShader); // put vertex shader in program
            gl.linkProgram(shaderProgram); // link program into gl context

            if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) { // bad program link
                throw "error during shader program linking: " + gl.getProgramInfoLog(shaderProgram);
            } else { // no shader program link errors
                gl.useProgram(shaderProgram); // activate shader program (frag and vert)
                vertexPositionAttrib = // get pointer to vertex shader input
                gl.getAttribLocation(shaderProgram, "vertexPosition"); 
                gl.enableVertexAttribArray(vertexPositionAttrib); // input to shader from array

                vertexColorAttrib = // get pointer to vertex shader input
                gl.getAttribLocation(shaderProgram, "vertexColor"); 
                gl.enableVertexAttribArray(vertexColorAttrib); // input to shader from array
                
                // Set uniform variables
                var materialAmbientLoc = gl.getUniformLocation(shaderProgram, "materialAmbient");
                gl.uniform3fv(materialAmbientLoc, ambientArr);
                var materialDiffuseLoc = gl.getUniformLocation(shaderProgram, "materialDiffuse");
                gl.uniform3fv(materialDiffuseLoc, colorArr);
                var materialSpecularLoc = gl.getUniformLocation(shaderProgram, "materialSpecular");
                gl.uniform3fv(materialSpecularLoc, specularArr);
                var materialShininessLoc = gl.getUniformLocation(shaderProgram, "materialShininess");
                gl.uniform1f(materialShininessLoc, shiny);

                var lightPositionLoc = gl.getUniformLocation(shaderProgram, "lightPosition");
                gl.uniform3fv(lightPositionLoc, [-0.5, 1.5, -0.5]);

                var cameraPositionLoc = gl.getUniformLocation(shaderProgram, "cameraPosition");
                gl.uniform3fv(cameraPositionLoc, [0.5, 0.5, -0.5]);

            } // end if no shader program link errors
        } // end if no compile errors
    } // end try 
    
    catch(e) {
        console.log(e);
    } // end catch
} // end setup shaders



// render the loaded model
function renderTriangles() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); // clear frame/depth buffers
    
    // vertex buffer: activate and feed into vertex shader
    gl.bindBuffer(gl.ARRAY_BUFFER,vertexBuffer); // activate
    gl.vertexAttribPointer(vertexPositionAttrib,3,gl.FLOAT,false,0,0); // feed

     // color buffer: activate and feed into vertex shader
     gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer); // activate
     gl.vertexAttribPointer(vertexColorAttrib, 3, gl.FLOAT, false, 0, 0); // feed

    // triangle buffer: activate and render
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,triangleBuffer); // activate
    
    
    gl.drawElements(gl.TRIANGLES,triBufferSize,gl.UNSIGNED_SHORT,0); // render

    gl.drawArrays(gl.TRIANGLES,0,3); // render
} // end render triangles




/* MAIN -- HERE is where execution begins after window load */

function main() {
  
  setupWebGL(); // set up the webGL environment
  loadTriangles(); // load in the triangles from tri file
  setupShaders(); // setup the webGL shaders
  renderTriangles(); // draw the triangles using webGL
  // event = keyup or keydown
  
  
} // end main
