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

  name_and_date = work.title.replace("(","<span class='subtitle'>(").replace(")",")</span>")
  date = moment(work.creation_date).format("YYYY")
  name_and_date = "#{name_and_date}<span class='title-date'>, #{date}</span>"

  $("#title .content").html(name_and_date)
  
  birth = jd_to_cal(work.generated_provenance.period[0].birth).format("YYYY")
  death = jd_to_cal(work.generated_provenance.period[0].death).format("YYYY")
  artistName = "#{work.artist.name} (#{birth}-#{death})"

  $("#artist .content").text(artistName)

  $('#artist').bigtext({ maxfontsize: 26, minfontsize: 15 })
  $("#title").bigtext({ maxfontsize: 24, minfontsize: 18 })


  prov = ("<li>#{period.provenance}#{if period.direct_transfer then ";" else "."}</li>" for period in work.generated_provenance.period).join("")
  prov = prov.replace(/\s\[.*?-.*?\]/g,"");    # Remove the artist's birth/death dates
  prov = prov.replace(/[\(|\)]/g,"");          # Remove parens
  prov = prov.replace(/, stock no.*?(;)/g,"$1"); # Remove stock numbers

  $('#provenance').html("<ul>#{prov}</ul>")

  loadWorkOntoMap(work.id); 

@gotoHome = () ->
  $('#holder').removeClass("single-item")
  handleMouseUp()

$ () ->
  $(".grid-image").mousedown gotoImage
  $("#back-button").mousedown window.gotoHome
  $('img').on 'dragstart', (event) ->
    event.preventDefault()
  $('body').keydown (e) ->
    $('body').toggleClass("no-cursor") if (e.which == 88)
