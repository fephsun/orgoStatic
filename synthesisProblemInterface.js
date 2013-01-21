//Be able to read user input
//Return data about what was dragged onto what
	//Cases: molecule dragged onto another molecule --> create new step producing mixture of the two molecules, with reaction having occurred if applicable
	//		 reagents dragged onto a molecule --> create new step applying those reagents to that molecule
//Server-side: return a new JSON object of molecules, reaction connections --> redraw
//			   check if the problem is completed yet --> return a boolean --> output success! if relevant.


//Things to write to make this happen:
	//Molecules are droppable --> two Ajax functions, depending on what is dragged onto them
	//Ajax GET request, at beginning --> initial drawing of stuff, ALSO target molecule
	//Generic function to produce divs, given list of (idnumber, SVG)
	//Generic function to plumb arrows, given list of (idnumber, idnumber, reagentstring)
	//...not bad at all.
	
	
var jq = jQuery.noConflict();

jq(document).ready(function() {


	jsPlumb.importDefaults({
		Connector:"StateMachine",
		PaintStyle:{ lineWidth:3, strokeStyle:"#000000"},
		ConnectionOverlays : [
			[ "Arrow", { 
				location:1,
				id:"arrow",
				length:10,
				foldback:0.5
			} ],
		]
	});
	
	


	//For making molecules and reactions draggable
	$( ".molecule" ).draggable({helper: "clone", revert:true, revertDuration: 100});
	//$( ".reaction" ).draggable({helper: "clone", revert:true, revertDuration: 100});
	$( ".reagent" ).draggable({helper: "clone", revert:true, revertDuration: 100});
	
	//Molecules are droppable, too
	$(".molecule").droppable({
		drop: function(event ui) {
			alert(ui.draggable.attr("class");
			if (ui.draggable.attr("class") == "molecule") {
				$.ajax({
					type: "POST",
					url: "/orgo/api/addMoleculeToMolecule/",
					data: 
				});
			}
			if (ui.draggable.attr("class") == "reagent") {
				$.ajax({
					type: "POST",
					url: "/orgo/api/addReagentToMolecule/",
					data: {'reagents': ui.draggable.attr("reagentString")},
					success: function(data) {
						dataObject = jQuery.parseJSON(data);
						//Redraw all the things
						drawMolecules(moleculeListSort(dataObject.molecules, dataObject.arrows));
						drawArrows(dataObject.arrows);
						
						//Update with whether or not the user was successful
						successUpdate(dataObject.success);
					}
				});
			}
		}
	});
	
	var successUpdate = function(success) {				
		if (success)
			$("#successbox").html("<div style=\"background-color:#00FF00\"><h2>SUCCESS!</h2></div>");
		else
			$("#successbox").html("<div style=\"background-color:#FFFFFF\"><h2>Not quite.</h2></div>");
	}
	
	//moleculesSorted is a "sorted" array of arrays, which optimizes arrow flow:
	//		[ [[id,svg], [id,svg], [id,svg], ... ], //first row
	//        [[id,svg], [id,svg], [id,svg], ... ], ... ] //second row
	var drawMolecules = function(moleculesSorted) {
		//we need to create a bunch of divs of the form
			//<div id={{id_number}} class="molecule">{{svg_data}}</div>
		htmlToAddToChart = "";
		for row in moleculesSorted {
			for molecule in row {
				//add a new div
				div = "<div id=" +
						String(molecule[0]) + 
						" class=\"molecule\">" + 
						String(molecule[1]) + 
						"</div>";
				htmlToAddToChart += div;
			}
			//add a line break, or something
			htmlToAddToChart += "<br />";
		}
		//put the constructed html in #leftbar
		$("leftbar").html("");
		$("leftbar").append(htmlToAddToChart);
	}
	
	//molecules is an array of arrays: [ [idnumber, "<svg>...</svg>"], ... ]
	//arrows is an array of arrays: [ [idnumber1, idnumber2, "reagentText"], ...]
	//returns a "sorted" array of arrays, which optimizes arrow flow:
	//		[ [[id,svg], [id,svg], [id,svg], ... ], //first row
	//        [[id,svg], [id,svg], [id,svg], ... ], ... ] //second row
	//CAN BE MADE BETTER, specifically by minimizing arrows crossing over each other.
	//RETURN TO THIS LATER.
	var moleculeListSort = function(molecules, arrows) {
		//Iterate through the list, determining horizontal rank:
			//Figure out which molecules are first (aka starting molecules)
		
		//This step is O(n^2).
		//It *could* be O(n).
		var startingMolecules = [[molecule[0], molecule[1], 0) for each (molecule in molecules) if ([arrow[1] for each (arrow in arrows)].indexOf(molecule[0]) == -1) ];//then the molecule does not have a precursor, so it is a starting molecule
		
			//Figure out the minimum distance of all other molecules from the starting molecules
		//Recursion!
		var svgGet = function(idNumber) {
			for (var i = 0; i<molecules.length; i++)
				if (molecules[i][0] == idNumber)
					return molecules[i][1];
			return "null";
		}
		var maxInd = 0;
		var rank = function(currentMolecules, ind) {
			//If the size of currentMolecules is equal to the size of molecules, return -- you're done
			if (currentMolecules.length == molecules.length)
				return currentMolecules;
			maxInd = ind;
			//Go through all of the reactions with beginnings in currentMolecules.
			//If not already in currentMolecules, append them, with the relevant index of distance from starting, to a new list
			//Call rank() again on the new list, with an incremented index.
			//This is O(n^3), and it also has to be called multiple times via recursion >.<				
			return rank(currentMolecules.concat([ [arrow[0], svgGet(arrow[0]), ind] for each (arrow in arrows) if ([x[0] for each (x in currentMolecules)].indexOf(arrow[0])==-1)  ]), ind+1);
		}
		
		//rankedMolecules is an array of arrays: [ [idnumber, "<svg>...</svg>", distanceFromStartingMolecules], ... ]
		var rankedMolecules = rank(startingMolecules, 1);
		
			
		//Iterate through the list, assigning nodes to vertical columns
		//Produce the final list.
		output = [startingMolecules];
		for (var i = 0; i <= maxInd; i++) {
			output.concat([ [ triple for each (triple in rankedMolecules) if (triple[2] == i) ] ]);
		}
		
		return output
	}
	
	//arrows is a list of lists: [ [idnumber1, idnumber2, "reagentText"], ...]
	var drawArrows = function(arrows) {
		//clear existing jsplumb connections -- how to?
		jsPlumb.detachAllConnections(".molecule");
		
		for (var i = 0; i < arrows.length; i++) {		
			molecule1 = $(".molecule #"+String(arrows[i][0]));
			molecule2 = $(".molecule #"+String(arrows[i][1]));
			var conn = jsPlumb.connect({
				source:molecule1,  // just pass in the current node in the selector for source 
				target:molecule2,
				parameters:{"reagents":(arrows[i][2])}
				// here we supply a different anchor for source and for target, and we get the element's "data-shape"
				// attribute to tell us what shape we should use, as well as, optionally, a rotation value.
				//anchors:[
				//	[ "Perimeter", { shape:$(shapes[i]).attr("data-shape"), rotation:$(shapes[i]).attr("data-rotation") }],
				//	[ "Perimeter", { shape:$(shapes[j]).attr( "data-shape"), rotation:$(shapes[j]).attr("data-rotation") }]
				//]		
			});
			conn.connection.getOverlay("label").setLabel(conn.getParameters().reagents);
		}
	}
	
	
	
	
	//For typing in autocompleted reagents
	//Update this line by parsing the value of [item for sublist in [REAGENTS[x][1] for x in range(len(REAGENTS)+1) if not x==0] for item in sublist]   in synthProblem.py
	var typeableReagents = ['H2', 'Hydrogen', 'PdC', 'Pd/C', 'Pd|C', 'Pd C', 'palladium', 'EtOH', 'Ethanol', 'Ethyl alcohol', 'C2H5OH', 'HF', 'Hydrogen fluoride', 'Hydrofluoric acid', 'HBr', 'Hydrogen bromide', 'Hydrobromic acid', 'HCl', 'Hydrogen chloride', 'Hydrochloric acid', 'HI', 'Hydrogen iodide', 'Hydroiodic acid', 'CH2Cl2', 'Dichloromethane', 'Fluorine', 'F2', 'Bromine', 'Br2', 'Chlorine', 'Cl2', 'Iodine', 'I2', 'ROOR', 'tBuOOtBu', 'Peroxide', 'Tert-butyl peroxide', 'Di-tert-butyl peroxide', 'mCPBA', 'PhCO3H', 'RCO3H', 'H2SO4', 'Sulfuric acid', 'H2O', 'Water', 'HOH', 'H20', 'HgSO4', 'Hg2+', 'Mercury sulfate', 'BH3', 'Borane', 'THF', 'Tetrahydrofuran', 'NaOH', 'Sodium hydroxide', 'Hydroxide', 'OH-', 'H2O2', 'Hydrogen peroxide', 'oso4', 'osmium tetroxide', 'osmium oxide', 'NMO', 'NMMO', 'N-Methylmorpholine N-oxide', 'Acetone', 'Propanone', '(CH3)2CO', 'Ozone', 'O3', 'Dimethyl sulfide', 'Methylthiomethane', 'Me2S', 'Zn', 'Zinc', 'Lindlar', 'Sodium', 'Na', 'NH3', 'Ammonia', 'Sodium amide', 'Sodamide', 'NaNH2', 'Amide', '1', 'equivalent', 'one', 'heat', 'hv', 'light', 'hnu', 'tert-butoxide', 'KOC(CH3)3'];
	//For having an autocomplete box which can take in multiple values
	function split( val ) {
		return val.split( /,\s*/ );
	}
	function extractLast( term ) {
		return split( term ).pop();
	}
	//Autocomplete box for reagents. Borrowed from jquery.
	$( "#reagentTyperBox" ).bind( "keydown", function( event ) {
		if ( event.keyCode === $.ui.keyCode.TAB && $( this ).data( "autocomplete" ).menu.active ) {
			event.preventDefault();
		}
	})
	.autocomplete({
		minLength: 0,
		source: function( request, response ) {
			response( $.ui.autocomplete.filter(typeableReagents, extractLast( request.term ) ) );
		},
		focus: function() {
			return false;
		},
		select: function( event, ui ) {
			var terms = split( this.value );
			terms.pop();
			terms.push( ui.item.value );
			terms.push( "" );
			this.value = terms.join( ", " );
			return false;
		}
	});
	  
	
	
	//For reagents in the sidebar
	$( "#reagentsHere" ).sortable();
	$( "#reagentsHere" ).disableSelection();

	
	updateReagents = function() {
		//Don't need to send anything back!
		//Update the reagents present in the sidebar with a new reagent.
		//Keep data about that reagent in currentReagents.
		var reagentString = $("#reagentTyperBox").val();
		
		$.ajax({
			type: "POST",
			url: "/orgo/api/returnReagentHtml/",
			data: {'reagentString': reagentString},
			success: function(data) {
				if (data != "") 
				$("#reagentsHere").prepend(data);
			},
		});
	}
	

});


var updateReagents;


