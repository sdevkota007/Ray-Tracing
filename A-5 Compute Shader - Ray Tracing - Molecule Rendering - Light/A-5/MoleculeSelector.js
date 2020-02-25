function MoleculeSelector(selectorElem, rt, sr){
	let recordRaySegments = true;
	if (!sr) recordRaySegments = false;
	let urlPath = 'https://threejs.org/examples/models/molecules/';
	let oData = getElementData();
	createOptions();
	render();
	function render(){
		console.log(selectorElem.value);
		getMoleculeData(urlPath+selectorElem.value);
	}
	function createOptions(){
		let MOLECULES = {
			"Ethanol": "ethanol.pdb",
			"Aspirin": "aspirin.pdb",
			"Caffeine": "caffeine.pdb",
			"Nicotine": "nicotine.pdb",
			"LSD": "lsd.pdb",
			"Cocaine": "cocaine.pdb",
			"Cholesterol": "cholesterol.pdb",
			"Lycopene": "lycopene.pdb",
			"Glucose": "glucose.pdb",
			"Aluminium oxide": "Al2O3.pdb",
			"Cubane": "cubane.pdb",
			"Copper": "cu.pdb",
			"Fluorite": "caf2.pdb",
			"Salt": "nacl.pdb",
			"YBCO superconductor": "ybco.pdb",
			"Buckyball": "buckyball.pdb",
			"Graphite": "graphite.pdb"
		};
		Object.entries(MOLECULES).forEach(function(e){
			let opt = document.createElement('option');
			opt.innerHTML = e[0];
			opt.value = e[1];
			selectorElem.appendChild(opt);			
		});
		selectorElem.addEventListener('change',render);
	}

	function getMoleculeData(molPath){
	  new THREE.PDBLoader().load(
		molPath,
		function ( pdb ) {
		  const geometryAtoms = pdb.geometryAtoms;
		  geometryAtoms.computeBoundingBox();
		  const atoms = pdb.json.atoms;
		  
		  let spheres = {
			type: "spheres",
			quadruples: [],
			color: []
		  };
		  let maxR = 0;
		  atoms.forEach(function(e){
			spheres.quadruples.push(e[0]);
			  spheres.quadruples.push(e[1]);
				spheres.quadruples.push(e[2]);
			let R = oData[e[4]];
			if (maxR < R)maxR = R; 
			spheres.quadruples.push(R);
			spheres.color.push(e[3][0]);
			  spheres.color.push(e[3][1]);
				spheres.color.push(e[3][2]);
		  });
		  //console.log(geometryAtoms.boundingBox,maxR);
		  
		  let box = geometryAtoms.boundingBox.expandByScalar(maxR);
		  
		  let rtScene=[spheres];            
		  let segmentBundles = rt.rayTracer({
			rtScene: rtScene,
			box: box
		  },recordRaySegments);
		  if (recordRaySegments)sr.renderer(segmentBundles);
		}
	  );
	}
	function getElementData(){
	  let elementDataJson = `[
	  {
		"atomic number": 1,
		"symbol": "H",
		"atomic mass": 1.00794,
		"name": "Hydrogen"
	  },
	  {
		"atomic number": 2,
		"symbol": "He",
		"atomic mass": 4.002602,
		"name": "Helium"
	  },
	  {
		"atomic number": 3,
		"symbol": "Li",
		"atomic mass": 6.941,
		"name": "Lithium"
	  },
	  {
		"atomic number": 4,
		"symbol": "Be",
		"atomic mass": 9.012182,
		"name": "Beryllium"
	  },
	  {
		"atomic number": 5,
		"symbol": "B",
		"atomic mass": 10.811,
		"name": "Boron"
	  },
	  {
		"atomic number": 6,
		"symbol": "C",
		"atomic mass": 12.0107,
		"name": "Carbon"
	  },
	  {
		"atomic number": 7,
		"symbol": "N",
		"atomic mass": 14.0067,
		"name": "Nitrogen"
	  },
	  {
		"atomic number": 8,
		"symbol": "O",
		"atomic mass": 15.9994,
		"name": "Oxygen"
	  },
	  {
		"atomic number": 9,
		"symbol": "F",
		"atomic mass": 18.9984032,
		"name": "Fluorine"
	  },
	  {
		"atomic number": 10,
		"symbol": "Ne",
		"atomic mass": 20.1797,
		"name": "Neon"
	  },
	  {
		"atomic number": 11,
		"symbol": "Na",
		"atomic mass": 22.98976928,
		"name": "Sodium"
	  },
	  {
		"atomic number": 12,
		"symbol": "Mg",
		"atomic mass": 24.305,
		"name": "Magnesium"
	  },
	  {
		"atomic number": 13,
		"symbol": "Al",
		"atomic mass": 26.9815386,
		"name": "Aluminum"
	  },
	  {
		"atomic number": 14,
		"symbol": "Si",
		"atomic mass": 28.0855,
		"name": "Silicon"
	  },
	  {
		"atomic number": 15,
		"symbol": "P",
		"atomic mass": 30.973762,
		"name": "Phosphorus"
	  },
	  {
		"atomic number": 16,
		"symbol": "S",
		"atomic mass": 32.065,
		"name": "Sulfur"
	  },
	  {
		"atomic number": 17,
		"symbol": "Cl",
		"atomic mass": 35.453,
		"name": "Chlorine"
	  },
	  {
		"atomic number": 18,
		"symbol": "Ar",
		"atomic mass": 39.948,
		"name": "Argon"
	  },
	  {
		"atomic number": 19,
		"symbol": "K",
		"atomic mass": 39.0983,
		"name": "Potassium"
	  },
	  {
		"atomic number": 20,
		"symbol": "Ca",
		"atomic mass": 40.078,
		"name": "Calcium"
	  },
	  {
		"atomic number": 21,
		"symbol": "Sc",
		"atomic mass": 44.955912,
		"name": "Scandium"
	  },
	  {
		"atomic number": 22,
		"symbol": "Ti",
		"atomic mass": 47.867,
		"name": "Titanium"
	  },
	  {
		"atomic number": 23,
		"symbol": "V",
		"atomic mass": 50.9415,
		"name": "Vanadium"
	  },
	  {
		"atomic number": 24,
		"symbol": "Cr",
		"atomic mass": 51.9961,
		"name": "Chromium"
	  },
	  {
		"atomic number": 25,
		"symbol": "Mn",
		"atomic mass": 54.938045,
		"name": "Manganese"
	  },
	  {
		"atomic number": 26,
		"symbol": "Fe",
		"atomic mass": 55.845,
		"name": "Iron"
	  },
	  {
		"atomic number": 27,
		"symbol": "Co",
		"atomic mass": 58.933195,
		"name": "Cobalt"
	  },
	  {
		"atomic number": 28,
		"symbol": "Ni",
		"atomic mass": 58.6934,
		"name": "Nickel"
	  },
	  {
		"atomic number": 29,
		"symbol": "Cu",
		"atomic mass": 63.546,
		"name": "Copper"
	  },
	  {
		"atomic number": 30,
		"symbol": "Zn",
		"atomic mass": 65.38,
		"name": "Zinc"
	  },
	  {
		"atomic number": 31,
		"symbol": "Ga",
		"atomic mass": 69.723,
		"name": "Gallium"
	  },
	  {
		"atomic number": 32,
		"symbol": "Ge",
		"atomic mass": 72.64,
		"name": "Germanium"
	  },
	  {
		"atomic number": 33,
		"symbol": "As",
		"atomic mass": 74.9216,
		"name": "Arsenic"
	  },
	  {
		"atomic number": 34,
		"symbol": "Se",
		"atomic mass": 78.96,
		"name": "Selenium"
	  },
	  {
		"atomic number": 35,
		"symbol": "Br",
		"atomic mass": 79.904,
		"name": "Bromine"
	  },
	  {
		"atomic number": 36,
		"symbol": "Kr",
		"atomic mass": 83.798,
		"name": "Krypton"
	  },
	  {
		"atomic number": 37,
		"symbol": "Rb",
		"atomic mass": 85.4678,
		"name": "Rubidium"
	  },
	  {
		"atomic number": 38,
		"symbol": "Sr",
		"atomic mass": 87.62,
		"name": "Strontium"
	  },
	  {
		"atomic number": 39,
		"symbol": "Y",
		"atomic mass": 88.90585,
		"name": "Yttrium"
	  },
	  {
		"atomic number": 40,
		"symbol": "Zr",
		"atomic mass": 91.224,
		"name": "Zirconium"
	  },
	  {
		"atomic number": 41,
		"symbol": "Nb",
		"atomic mass": 92.90638,
		"name": "Niobium"
	  },
	  {
		"atomic number": 42,
		"symbol": "Mo",
		"atomic mass": 95.96,
		"name": "Molybdenum"
	  },
	  {
		"atomic number": 43,
		"symbol": "Tc",
		"atomic mass": 98,
		"name": "Technetium"
	  },
	  {
		"atomic number": 44,
		"symbol": "Ru",
		"atomic mass": 101.07,
		"name": "Ruthenium"
	  },
	  {
		"atomic number": 45,
		"symbol": "Rh",
		"atomic mass": 102.9055,
		"name": "Rhodium"
	  },
	  {
		"atomic number": 46,
		"symbol": "Pd",
		"atomic mass": 106.42,
		"name": "Palladium"
	  },
	  {
		"atomic number": 47,
		"symbol": "Ag",
		"atomic mass": 107.8682,
		"name": "Silver"
	  },
	  {
		"atomic number": 48,
		"symbol": "Cd",
		"atomic mass": 112.411,
		"name": "Cadmium"
	  },
	  {
		"atomic number": 49,
		"symbol": "In",
		"atomic mass": 114.818,
		"name": "Indium"
	  },
	  {
		"atomic number": 50,
		"symbol": "Sn",
		"atomic mass": 118.71,
		"name": "Tin"
	  },
	  {
		"atomic number": 51,
		"symbol": "Sb",
		"atomic mass": 121.76,
		"name": "Antimony"
	  },
	  {
		"atomic number": 52,
		"symbol": "Te",
		"atomic mass": 127.6,
		"name": "Tellurium"
	  },
	  {
		"atomic number": 53,
		"symbol": "I",
		"atomic mass": 126.90447,
		"name": "Iodine"
	  },
	  {
		"atomic number": 54,
		"symbol": "Xe",
		"atomic mass": 131.293,
		"name": "Xenon"
	  },
	  {
		"atomic number": 55,
		"symbol": "Cs",
		"atomic mass": 132.9054519,
		"name": "Cesium"
	  },
	  {
		"atomic number": 56,
		"symbol": "Ba",
		"atomic mass": 137.327,
		"name": "Barium"
	  },
	  {
		"atomic number": 57,
		"symbol": "La",
		"atomic mass": 138.90547,
		"name": "Lanthanum"
	  },
	  {
		"atomic number": 58,
		"symbol": "Ce",
		"atomic mass": 140.116,
		"name": "Cerium"
	  },
	  {
		"atomic number": 59,
		"symbol": "Pr",
		"atomic mass": 140.90765,
		"name": "Praseodymium"
	  },
	  {
		"atomic number": 60,
		"symbol": "Nd",
		"atomic mass": 144.242,
		"name": "Neodymium"
	  },
	  {
		"atomic number": 61,
		"symbol": "Pm",
		"atomic mass": 145,
		"name": "Promethium"
	  },
	  {
		"atomic number": 62,
		"symbol": "Sm",
		"atomic mass": 150.36,
		"name": "Samarium"
	  },
	  {
		"atomic number": 63,
		"symbol": "Eu",
		"atomic mass": 151.964,
		"name": "Europium"
	  },
	  {
		"atomic number": 64,
		"symbol": "Gd",
		"atomic mass": 157.25,
		"name": "Gadolinium"
	  },
	  {
		"atomic number": 65,
		"symbol": "Tb",
		"atomic mass": 158.92535,
		"name": "Terbium"
	  },
	  {
		"atomic number": 66,
		"symbol": "Dy",
		"atomic mass": 162.5,
		"name": "Dysprosium"
	  },
	  {
		"atomic number": 67,
		"symbol": "Ho",
		"atomic mass": 164.93032,
		"name": "Holmium"
	  },
	  {
		"atomic number": 68,
		"symbol": "Er",
		"atomic mass": 167.259,
		"name": "Erbium"
	  },
	  {
		"atomic number": 69,
		"symbol": "Tm",
		"atomic mass": 168.93421,
		"name": "Thulium"
	  },
	  {
		"atomic number": 70,
		"symbol": "Yb",
		"atomic mass": 173.054,
		"name": "Ytterbium"
	  },
	  {
		"atomic number": 71,
		"symbol": "Lu",
		"atomic mass": 174.9668,
		"name": "Lutetium"
	  },
	  {
		"atomic number": 72,
		"symbol": "Hf",
		"atomic mass": 178.49,
		"name": "Hafnium"
	  },
	  {
		"atomic number": 73,
		"symbol": "Ta",
		"atomic mass": 180.94788,
		"name": "Tantalum"
	  },
	  {
		"atomic number": 74,
		"symbol": "W",
		"atomic mass": 183.84,
		"name": "Tungsten"
	  },
	  {
		"atomic number": 75,
		"symbol": "Re",
		"atomic mass": 186.207,
		"name": "Rhenium"
	  },
	  {
		"atomic number": 76,
		"symbol": "Os",
		"atomic mass": 190.23,
		"name": "Osmium"
	  },
	  {
		"atomic number": 77,
		"symbol": "Ir",
		"atomic mass": 192.217,
		"name": "Iridium"
	  },
	  {
		"atomic number": 78,
		"symbol": "Pt",
		"atomic mass": 195.084,
		"name": "Platinum"
	  },
	  {
		"atomic number": 79,
		"symbol": "Au",
		"atomic mass": 196.966569,
		"name": "Gold"
	  },
	  {
		"atomic number": 80,
		"symbol": "Hg",
		"atomic mass": 200.59,
		"name": "Mercury"
	  },
	  {
		"atomic number": 81,
		"symbol": "Tl",
		"atomic mass": 204.3833,
		"name": "Thallium"
	  },
	  {
		"atomic number": 82,
		"symbol": "Pb",
		"atomic mass": 207.2,
		"name": "Lead"
	  },
	  {
		"atomic number": 83,
		"symbol": "Bi",
		"atomic mass": 208.9804,
		"name": "Bismuth"
	  },
	  {
		"atomic number": 84,
		"symbol": "Po",
		"atomic mass": 209,
		"name": "Polonium"
	  },
	  {
		"atomic number": 85,
		"symbol": "At",
		"atomic mass": 210,
		"name": "Astatine"
	  },
	  {
		"atomic number": 86,
		"symbol": "Rn",
		"atomic mass": 222,
		"name": "Radon"
	  },
	  {
		"atomic number": 87,
		"symbol": "Fr",
		"atomic mass": 223,
		"name": "Francium"
	  },
	  {
		"atomic number": 88,
		"symbol": "Ra",
		"atomic mass": 226,
		"name": "Radium"
	  },
	  {
		"atomic number": 89,
		"symbol": "Ac",
		"atomic mass": 227,
		"name": "Actinium"
	  },
	  {
		"atomic number": 90,
		"symbol": "Th",
		"atomic mass": 232.03806,
		"name": "Thorium"
	  },
	  {
		"atomic number": 91,
		"symbol": "Pa",
		"atomic mass": 231.03588,
		"name": "Protactinium"
	  },
	  {
		"atomic number": 92,
		"symbol": "U",
		"atomic mass": 238.02891,
		"name": "Uranium"
	  },
	  {
		"atomic number": 93,
		"symbol": "Np",
		"atomic mass": 237,
		"name": "Neptunium"
	  },
	  {
		"atomic number": 94,
		"symbol": "Pu",
		"atomic mass": 244,
		"name": "Plutonium"
	  },
	  {
		"atomic number": 95,
		"symbol": "Am",
		"atomic mass": 243,
		"name": "Americium"
	  },
	  {
		"atomic number": 96,
		"symbol": "Cm",
		"atomic mass": 247,
		"name": "Curium"
	  },
	  {
		"atomic number": 97,
		"symbol": "Bk",
		"atomic mass": 247,
		"name": "Berkelium"
	  },
	  {
		"atomic number": 98,
		"symbol": "Cf",
		"atomic mass": 251,
		"name": "Californium"
	  },
	  {
		"atomic number": 99,
		"symbol": "Es",
		"atomic mass": 252,
		"name": "Einsteinium"
	  },
	  {
		"atomic number": 100,
		"symbol": "Fm",
		"atomic mass": 257,
		"name": "Fermium"
	  },
	  {
		"atomic number": 101,
		"symbol": "Md",
		"atomic mass": 258,
		"name": "Mendelevium"
	  },
	  {
		"atomic number": 102,
		"symbol": "No",
		"atomic mass": 259,
		"name": "Nobelium"
	  },
	  {
		"atomic number": 103,
		"symbol": "Lr",
		"atomic mass": 262,
		"name": "Lawrencium"
	  },
	  {
		"atomic number": 104,
		"symbol": "Rf",
		"atomic mass": 267,
		"name": "Rutherfordium"
	  },
	  {
		"atomic number": 105,
		"symbol": "Db",
		"atomic mass": 268,
		"name": "Dubnium"
	  },
	  {
		"atomic number": 106,
		"symbol": "Sg",
		"atomic mass": 271,
		"name": "Seaborgium"
	  },
	  {
		"atomic number": 107,
		"symbol": "Bh",
		"atomic mass": 272,
		"name": "Bohrium"
	  },
	  {
		"atomic number": 108,
		"symbol": "Hs",
		"atomic mass": 270,
		"name": "Hassium"
	  },
	  {
		"atomic number": 109,
		"symbol": "Mt",
		"atomic mass": 276,
		"name": "Meitnerium"
	  },
	  {
		"atomic number": 110,
		"symbol": "Ds",
		"atomic mass": 281,
		"name": "Darmstadtium"
	  },
	  {
		"atomic number": 111,
		"symbol": "Rg",
		"atomic mass": 280,
		"name": "Roentgenium"
	  },
	  {
		"atomic number": 112,
		"symbol": "Cn",
		"atomic mass": 285,
		"name": "Copernicium"
	  },
	  {
		"atomic number": 113,
		"symbol": "Uut",
		"atomic mass": 284,
		"name": "Ununtrium"
	  },
	  {
		"atomic number": 114,
		"symbol": "Uuq",
		"atomic mass": 289,
		"name": "Ununquadium"
	  },
	  {
		"atomic number": 115,
		"symbol": "Uup",
		"atomic mass": 288,
		"name": "Ununpentium"
	  },
	  {
		"atomic number": 116,
		"symbol": "Uuh",
		"atomic mass": 293,
		"name": "Ununhexium"
	  },
	  {
		"atomic number": 117,
		"symbol": "Uus",
		"atomic mass": 294,
		"name": "Ununseptium"
	  },
	  {
		"atomic number": 118,
		"symbol": "Uuo",
		"atomic mass": 294,
		"name": "Ununoctium"
	  }
	  ]`;
	  let oData = {};
	  JSON.parse(elementDataJson).forEach(
		function(e){
			oData[e.symbol] = 0.25*Math.round(Math.pow(e["atomic mass"],1/3));
		}
	  );
	  return oData;
	}
}