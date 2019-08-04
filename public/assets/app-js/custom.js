var url = '/user/get-user';
$.ajax( url, {
'type': 'GET',
'processData': false,
'contentType': 'application/json'
}).done(function(data) {
  var name = data.replace(/\w\S*/g, function(txt){return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();})
  $('#user-name').text(name)
}).fail(function(err) {
  console.log(err);
});
