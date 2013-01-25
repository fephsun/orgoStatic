
var jq = jQuery.noConflict();
var state = "Normal";
var pk = 0; //Gets changed before chat starts.

jq(document).ready(function() {
    
    var isSolution = false;
    
    //For making a link display the solution
    $("#solutionDisplay").click(function() {
        $.ajax({
            type: "GET",
            url: "/orgo/api/displaySolution/",
            data: {},
            success: function(data) {
                drawAllTheThings(data);
                isSolution = true;
            },
        });
    });
    
    
    //For drawing stuff upon initialization
    var redrawProblem = function() {
        $.ajax({
            type: "GET",
            url: "/orgo/api/getSynthesisData/",
            data: {},
            success: function(data) {
                drawAllTheThings(data);
            },
        });
    }
    
    redrawProblem();

    jsPlumb.bind("ready", function() {
        //When you scroll the left bar, the jsplumb stuff should be redrawn
        //$('#leftbar').scroll(function () {
        //    jsPlumb.repaintEverything();
        //});
        $('#leftbar').scroll(function () {
            jsPlumb.repaintEverything();
        });

        jsPlumb.importDefaults({
            Connector:"StateMachine",
            PaintStyle:{ lineWidth:3, strokeStyle:"#000000"},
            ConnectionOverlays : [
                [ "Arrow", { 
                    location:1,
                    id:"arrow",
                    length:10,
                    foldback:5
                } ],
            ],
            Anchors : [ "TopCenter", "BottomCenter" ]
        });
    });
    
    var drawAllTheThings = function(data) {
        dataObject = jQuery.parseJSON(data);
        //Redraw all the things
        
        drawMolecules(moleculeListSort(dataObject.molecules, dataObject.arrows));
        drawArrows(dataObject.arrows);
        
        //Update with whether or not the user was successful
        successUpdate(dataObject.success);
    }
    
    //$( ".reaction" ).draggable({helper: "clone", revert:true, revertDuration: 100});
    //$( ".reagent" ).draggable({helper: "clone", revert:true, revertDuration: 100});

    
    
    
    var successUpdate = function(success) {
        if (success == "solution")
            $("#successbox").html("<div style=\"background-color:#FFFFFF\"><h2>Solution:</h2></div>");
        else if (success)
            $("#successbox").html("<div style=\"background-color:#00FF00\"><h2>SUCCESS!</h2></div>");
        else
            $("#successbox").html("<div style=\"background-color:#FFFFFF\"><h2>Unsolved</h2></div>");
    }
    
    //moleculesSorted is a "sorted" array of arrays, which optimizes arrow flow:
    //        [ [[id,svg], [id,svg], [id,svg], ... ], //first row
    //        [[id,svg], [id,svg], [id,svg], ... ], ... ] //second row
    var drawMolecules = function(moleculesSorted) {
        console.log(moleculesSorted.length);
        //we need to create a bunch of divs of the form
            //<div id={{id_number}} class="molecule">{{svg_data}}</div>
        htmlToAddToChart = "";
        for (var i=0; i<moleculesSorted.length; i++){      //for row in moleculesSorted
            htmlToAddToChart += "<div id=\"cleared\">";
            for (var j=0; j<moleculesSorted[i].length; j++) {      //for molecule in row
                molecule = moleculesSorted[i][j]
                //add a new div
                div = "<div id=" +
                        String(molecule[0]) + 
                        " class=\"molecule\">" + 
                        String(molecule[1]) + 
                        "</div>";
                htmlToAddToChart += div;
                console.log("Added new div.");
            }
            //add a line break, or something
            htmlToAddToChart += "</div><br />";
        }
        //put the constructed html in #leftbar
        $("#leftbar").html("");
        $("#leftbar").append(htmlToAddToChart);
        //For making molecules and reactions draggable
        $( ".molecule" ).draggable({helper: "clone", revert:true, revertDuration: 100});
        //The right bar is droppable, and triggers deletion of molecules
        $("rightbar").droppable({
            drop: function(event, ui) {
                $.ajax({
                    type: "POST",
                    url: "/orgo/api/deleteMolecule/",
                    data: {"moleculeID": ui.draggable.attr("id")},
                    success: function(data) {
                        drawAllTheThings(data);
                    }
                });
            }
        });
        //Molecules are droppable, triggering addition of reagents or other molecules
        $(".molecule").droppable({
            drop: function(event, ui) {
                if (isSolution) {
                    isSolution = false;
                    redrawProblem();
                    jsPlumb.repaintEverything();
                }
                else if (ui.draggable.hasClass("molecule")) {
                    $.ajax({
                        type: "POST",
                        url: "/orgo/api/addMoleculeToMolecule/",
                        data: {'molecule1': ui.draggable.attr("id"),
                               'molecule2': $(this).attr("id")},
                        success: function(data) {
                            drawAllTheThings(data);
                        },
                    });
                }
                else if (ui.draggable.hasClass("reagent")) {
                    $.ajax({
                        type: "POST",
                        url: "/orgo/api/addReagentToMolecule/",
                        data: {'reagents': ui.draggable.attr("reagentString"),
                               'moleculeOn': $(this).attr("id")},
                        success: function(data) {
                            drawAllTheThings(data);
                            console.log("Reagent string sent to ajax request: "+ui.draggable.attr("reagentString"));
                        },
                    });
                }
            }
        });
    }
    
    //molecules is an array of arrays: [ [idnumber, "<svg>...</svg>"], ... ]
    //arrows is an array of arrays: [ [idnumber1, idnumber2, "reagentText"], ...]
    //returns a "sorted" array of arrays, which optimizes arrow flow:
    //        [ [[id,svg], [id,svg], [id,svg], ... ], //first row
    //        [[id,svg], [id,svg], [id,svg], ... ], ... ] //second row
    //CAN BE MADE BETTER, specifically by minimizing arrows crossing over each other.
    //RETURN TO THIS LATER.
    var moleculeListSort = function(molecules, arrows) {
        console.log("Init molecule len: "+String(molecules.length));
        //Iterate through the list, determining horizontal rank:
            //Figure out which molecules are first (aka starting molecules)
        
        // This step is O(n^2).
        // It *could* be O(n).
        
        var arrowProducts = [];
        for (var i=0; i<arrows.length; i++) {
            arrowProducts.push(arrows[i][1]);
            console.log("Arrow: "+arrows[i][0]+", "+arrows[i][1]+", "+arrows[i][2]);
        }
        
        
        var startingMolecules = [];
        for (var i=0; i<molecules.length; i++) {
            m = molecules[i];
            if (arrowProducts.indexOf(m[0]) == -1) {
                startingMolecules.push([m[0], m[1], 0]);
                console.log("Added to starting: "+m[0]);
            }
            else console.log("Not added to starting: "+m[0]);
        }
        
        
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
            if (currentMolecules.length >= molecules.length)
                return currentMolecules;
                
            maxInd = ind;
            //Go through all of the reactions with beginnings in currentMolecules.
            //If not already in currentMolecules, append them, with the relevant index of distance from starting, to a new list
            //Call rank() again on the new list, with an incremented index.
            //This is O(n^3), and it also has to be called multiple times via recursion >.<            
            
            //[x[0] for each (x in currentMolecules)]
            
            var currentMoleculeIndices = []
            //var s = ""
            for (var j=0; j<currentMolecules.length; j++) {
                currentMoleculeIndices.push(currentMolecules[j][0]);
            //    s +=  currentMolecules[j][0]+",";
            }
            
            //[ [arrow[0], svgGet(arrow[0]), ind] for each (arrow in arrows) if ([x[0] for each (x in currentMolecules)].indexOf(arrow[0])==-1)  ]
            var toAdd = []
            for (var i=0; i<arrows.length; i++) {
                var aP = arrows[i][1]; //arrow product
                var aR = arrows[i][0]; //arrow reactant
                
                var toAddContents = []
                for (var j=0; j<toAdd.length; j++) {
                    toAddContents.push(toAdd[j][0]);
                }

                
                //If the current arrow's product is not in the current list AND not in toAdd[any][0],
                //AND the current arrow's reactant IS in the current list,
                //add it
                if ((currentMoleculeIndices.indexOf(aP) == -1) && (toAddContents.indexOf(aP) == -1) && !(currentMoleculeIndices.indexOf(aR) == -1))
                    toAdd.push([aP, svgGet(aP), ind]);
                else
                    console.log("Arrow product "+aP+" is not in current list, "+s);
            }
            
            if (ind > 10)
                return currentMolecules;
            
            console.log("Re-recursing at 1+"+ind);
            return rank(currentMolecules.concat(toAdd), ind+1);
        }
        console.log("Starting recursion.");
        //rankedMolecules is an array of arrays: [ [idnumber, "<svg>...</svg>", distanceFromStartingMolecules], ... ]
        var rankedMolecules = rank(startingMolecules, 1);
        console.log("Ended recursion.");
        
        console.log("Intermediate molecule len: "+String(rankedMolecules.length));
        s = "";
        for (var i = 0; i<rankedMolecules.length; i++)
            s += rankedMolecules[i][0] + ", " + rankedMolecules[i][2] + "\n";
        console.log(s); 
           
        //Iterate through the list, assigning nodes to vertical columns
        //Produce the final list.
        output = [startingMolecules];
        for (var i = 1; i <= maxInd; i++) {
        
            //[ [ triple for each (triple in rankedMolecules) if (triple[2] == i) ] ]
            alsoToAdd = [];
            for(var j = 0; j < rankedMolecules.length; j++) {
                if (rankedMolecules[j][2] == i) {
                    console.log("...");
                    console.log(rankedMolecules[j]);
                    alsoToAdd.push(rankedMolecules[j]);
                    console.log("!!!");
                    console.log(alsoToAdd);
                }
            }
            output.push(alsoToAdd);
        }
        
        console.log("Finit molecule height: "+String(output.length));
        for(var i = 0; i<output.length; i++)
            console.log("Row length: "+String(output[i].length));
        
        return output
    }
    
    //arrows is a list of lists: [ [idnumber1, idnumber2, "reagentText"], ...]
    var drawArrows = function(arrows) {
        //clear existing jsplumb connections -- how to?
        
        jsPlumb.bind("ready", function() {
            jsPlumb.detachAllConnections();
            for (var i = 0; i < arrows.length; i++) {        
                molecule1 = document.getElementById(String(arrows[i][0]));
                console.log(molecule1);
                molecule2 = document.getElementById(String(arrows[i][1]));
                console.log(molecule2);
                var conn = jsPlumb.connect({
                    source:molecule1,  // just pass in the current node in the selector for source 
                    target:molecule2,
                    // here we supply a different anchor for source and for target, and we get the element's "data-shape"
                    // attribute to tell us what shape we should use, as well as, optionally, a rotation value.
                    anchors:[
                        [ "Perimeter", {shape:"rectangle"}],
                        [ "Perimeter", {shape:"rectangle"}]
                    ],
                    overlays:[
                        [ "Label", {label:("<span class=\"arrowLabel\">" + arrows[i][2] + "</span>"), id:"label"}]
                    ],
                    enabled:false,
                    endpoint:["Dot", {radius:1}],
                });
                //console.log("...");
                //conn.getOverlay("label").setLabel(conn.getParameters().reagents);
                console.log("blah");
            }
        });
    }
    
    
    
    
    //For typing in autocompleted reagents
    //Update this line by parsing the value of [item for sublist in [REAGENTS[x][1] for x in range(len(REAGENTS)+1) if not x==0] for item in sublist]   in synthProblem.py
    var typeableReagents = ['H2', 'Hydrogen', 'Pd/C', 'Palladium/Carbon catalyst', 'EtOH', 'Ethanol', 'Ethyl alcohol', 'C2H5OH', 'HF', 'Hydrogen fluoride', 'Hydrofluoric acid', 'HBr', 'Hydrogen bromide', 'Hydrobromic acid', 'HCl', 'Hydrogen chloride', 'Hydrochloric acid', 'HI', 'Hydrogen iodide', 'Hydroiodic acid', 'CH2Cl2', 'Dichloromethane', 'Fluorine', 'F2', 'Bromine', 'Br2', 'Chlorine', 'Cl2', 'Iodine', 'I2', 'ROOR', 'tBuOOtBu', 'Peroxide', 'Tert-butyl peroxide', 'Di-tert-butyl peroxide', 'mCPBA', 'PhCO3H', 'RCO3H', 'H2SO4', 'Sulfuric acid', 'H2O', 'Water', 'HOH', 'H20', 'HgSO4', 'Hg2+', 'Mercury sulfate', 'BH3', 'Borane', 'THF', 'Tetrahydrofuran', 'NaOH', 'Sodium hydroxide', 'Hydroxide', 'OH-', 'H2O2', 'Hydrogen peroxide', 'OsO4', 'Osmium tetroxide', 'Osmium oxide', 'NMO', 'NMMO', 'N-Methylmorpholine N-oxide', 'Acetone', 'Propanone', '(CH3)2CO', 'Ozone', 'O3', 'Dimethyl sulfide', 'Methylthiomethane', 'Me2S', 'Zn', 'Zinc', 'Lindlar catalyst', 'cat. Lindlar', 'Sodium', 'Na', 'NH3', 'Ammonia', 'Sodium amide', 'Sodamide', 'NaNH2', 'Amide', '1 equivalent', 'One equivalent', 'heat', 'hv', 'light', 'hnu', 'tert-butoxide', 'KOtBu', 'Potassium tert-butoxide', 'KOC(CH3)3'];
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
    
    //For chat functionality.    
    $("#submit").click(function(){
        if (state =! "Chatting") {
            return;
        }
        //Submit a new message to the server.
        $.ajax({
            type: "POST",
            url: "/orgo/chat/helpeechatpoll/",
            data: {'PK': pk,
                   'message': $('#input').val()},
            success: update
        });
        //Reset the text input.
        $('#input').val("");
    });
    

});


var updateReagents;

function askForHelp() {
    $("#chatbox").css('margin-left', 'auto');
    $("#chatbox").css('margin-right', 'auto');
    $.ajax({
        type: "GET",
        url: "/orgo/chat/askforhelp/",
        success: function(data) {
            $("#helpbox").html(data+" people waiting for help, including you");
        }
    });
    setTimeout(keepPolling, 3000);
}

function keepPolling() {
    $.ajax({
        type: "GET",
        url: "/orgo/chat/helpeepoll/",
        success: function(data) {
            //$("#allOut").html(data);
            dataObject = jQuery.parseJSON(data);
            if (dataObject.success){
                $("#helpbox").html("Success!  Helped by "+dataObject.helper+"<br / >");
                state = "Chatting";
                pk = dataObject.chatPK;
                getChat();
            } else {
                $("#helpbox").html(dataObject.queueSize+" people waiting for help, including you");
                setTimeout(keepPolling, 3000);
            }

        }
    });
}

function getChat() {
    //Gets chat messages from the server.
    $.ajax({
        type: "POST",
        url: "/orgo/chat/helpeechatpoll/",
        data: {'PK': pk},
        success: update
    });
    setTimeout(getChat, 3000);
}

function update(data) {
    //$("#allOut").html(data);
    jsonObject = $.parseJSON(data);
    if (!jsonObject['open']) {
        $("#helpbox").html("Session dropped.  Did the other user log out?");
        state = "Normal";
        return;
    }
    for (i=0; i<jsonObject['length']; i++) {
        $("#helpbox").append(jsonObject[i] + "<br / >");
    }
    //Scroll to bottom.
    if (jsonObject['length'] != 0) {
        $("#helpbox").scrollTop($("#helpbox").height());
    }
}






