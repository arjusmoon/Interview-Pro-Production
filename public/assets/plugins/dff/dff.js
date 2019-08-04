var room = 1;

function recruiters_select_fields() {

    room++;
    var objTo = document.getElementById('recruiters_select_fields')
    var divtest = document.createElement("div");
    divtest.setAttribute("class", "col-sm-6 nopadding recruiters-form-group removeclass" + room);
    var rdiv = 'removeclass' + room;
    divtest.innerHTML = '<div class="form-group"><div class="input-group"> <select class="form-control recruiters-select" id="recruiters_select_fieldsName" name="recruiters[]"><option value="">Select Interviewer</option></select><div class="input-group-append"> <button class="btn btn-danger" type="button" onclick="remove_recruiter_fields(' + room + ');"> <i class="fa fa-minus"></i> </button></div></div></div><div class="clear"></div>';

    objTo.appendChild(divtest)
}

function remove_recruiter_fields(rid) {
    $('.removeclass' + rid).remove();
}
