function Camera(FOV,columns,rows,aspect){
	console.log(columns/rows);
	this.FOV = FOV;
	this.aspect = aspect||(columns/rows);
	this.rows = rows;
	this.columns = columns;
	this.Eye = new THREE.Vector3( 0, 0, 1 );
	this.At = new THREE.Vector3( 0, 0, 0 );
	this.Up = new THREE.Vector3( 0, 1, 0 );
	this.U = new THREE.Vector3(1,0,0);
	this.V = new THREE.Vector3(0,1,0);
	this.W = new THREE.Vector3(0,0,1);

	this.setEye=function(eye){
		this.Eye.fromArray(eye);
	}
	this.setAt=function(at){
		this.At.fromArray(at);
	}
	this.setUp=function(up){
		this.Up.fromArray(up);
	}
	this.computeCameraAxes=function(){
	  this.W.fromArray(this.Eye[0]-this.At[0],this.Eye[1]-this.At[1],this.Eye[2]-this.At[2]);
	  this.W.normalize();
	  this.U.fromArray(this.Up[0],this.Up[1],this.Up[2]);
	  this.U.crossVectors(this.Up,W).normalize();
	  this.V.crossVectors(W,U);
	}
};
