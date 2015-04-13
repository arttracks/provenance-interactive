#= require "_lodash.min"
#= require '_bigtext'


@getWork = (id)->
  _.find collection, (work) ->
    work.id == parseInt(id)

gotoImage = () ->
  $('#holder').addClass("single-item")
  work = getWork($(this).attr("id").split("_")[1])
  img = $("#preview_#{work.id}").attr("src")
  $('#preview-image').attr("src",img)
  $("#acc-num").text(work.accession_number)
  $("#title .content").html(work.title.replace("(","<br/><span class='subtitle'>(").replace(")",")</span>"))
  $("#artist .content").text(work.artist.name)

  $('#artist').bigtext({ maxfontsize: 26, minfontsize: 15 })
  $("#title").bigtext({ maxfontsize: 24, minfontsize: 15 })


  prov = ("<li>#{period.provenance}#{if period.direct_transfer then ";" else "."}</li>" for period in work.generated_provenance.period).join("")
  $('#provenance').html("<ul>#{prov}</ul>")

  loadWorkOntoMap(work.id); 

gotoHome = () ->
  handleMouseUp()
  $('#holder').removeClass("single-item")

$ () ->
  $(".grid-image").mousedown gotoImage
  $("#back-button").mousedown gotoHome
  $('img').on 'dragstart', (event) ->
    event.preventDefault()
  $('body').keydown (e) ->
    $('body').toggleClass("no-cursor") if (e.which == 88)
