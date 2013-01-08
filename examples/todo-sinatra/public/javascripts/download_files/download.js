var jQueryUI = {};

function disableDownload() {
	$('#download_zip')
		.addClass('ui-state-disabled')
		.attr('disabled', true);
}

function enableDownload() {
	$('#download_zip')
		.removeClass('ui-state-disabled')
		.attr('disabled', false);
}

function updateFilesize() {
	var count = 0;
	$('#download-builder-components :checked').each(function() {
		count++;
	});
	$('em.components-selected').html('('+count+' of '+getTotalCount()+' selected)');

}

function updateSelectAllLinks() {
	
	//see if each group has all selected
	$('.component-group').each(function(){
		if( $(this).find('input[type=checkbox]:checked').size() == $(this).find('input[type=checkbox]').size()){
			$(this).find('.select-all:contains(Select all)').trigger('click');
		}
		
	});
	//if they're all selected
	if( $('input[type=checkbox]:checked').size() == $('input[type=checkbox]').size()){
		$('div.download-builder-header .select-all:contains(Select all components)').trigger('click');
	}
}

jQuery.extend(jQuery.expr[":"], {
  highIndex     : function(elem){return elem.selectedIndex > 0;}
});

function is_legacy(){
	return $('input[name="ui-version"][value="'+ versionLegacy +'"]:checked').length > 0;
}

function compatVersions(){
	if( is_legacy() ){
		$("div.field-pair.latest").hide()
		$("input:checkbox:checked").addMissingDependencies();
	}
	else {
		$("div.field-pair.latest").show()
		$("input:checkbox:checked").addMissingDependencies();
	}
}

$.fn.addMissingDependencies = function() {
	
	this.each(function() {
		$(jQueryUI.dependencies[this.value]).each(function() {
			var $input = $("input[value='"+this+"'], select[id='"+this+"']");
			if( $input.length && $input.is('input')){
				if(!$input[0].checked && !($input.closest('.latest').length && is_legacy()) ) {
					$input.attr('checked',true)
					.parent().effect("highlight", null, 1000);
				}
			}
			//select first index of theme if not selected
			else if( $input.length && $input.is('select') ){
				if( $input[0].selectedIndex == 0){
					$input[0].selectedIndex = 1;
					$input.parent().effect("highlight", null, 1000);
				}	
			}
		});	
	});
	
};

$.fn.resolveDependencies = function() {
	
	var returnValue = true;
	this.each(function() {
		
		var self = this, needed = false;
		$('#download-builder-components :checked').each(function() {
			var c = this;
			$(jQueryUI.dependencies[this.value]).each(function() {
				if(this == self.value) { needed = c; returnValue = false; }
			});
		});
		
		//If it is indeed needed, open a dialog
		if(needed) {
			
			var d = $(needed).next().find('.component-title').html();
			var c = $(this).next().find('.component-title').html();
			
			$('<div><p><span class="ui-icon ui-icon-alert" style="float:left; margin:0 7px 50px 0;"></span><b>'+c+'</b> is a needed dependency of <b>'+d+'</b>.</p><p>Please uncheck <b>'+d+'</b> first.</p></div>')
				.dialog({
					modal: true,
					open: function() { $(this).parent().attr('id', 'demo-dialog'); },
					title: 'Needed dependency',
					buttons: { Ok: function() { $(this).dialog('close'); } }
				});
	
			return this.checked = true && $(this).parent().effect("highlight", null, 1000);
			
		}
		
	});
	
	return returnValue;
	
};

function getTotalCount() {
	var count = 0;
	for(var i in jQueryUI.dependencies) {
		count++;
	}
	return count;
}

function setFormFields(){
	if( $.cookie('downloadBuilderInputs') || $.cookie('downloadBuilderInputs') == ""){
		var prefs = unescape($.cookie('downloadBuilderInputs')).split('&');
		$.each(prefs, function(){
			//set widgets
			if(this.split('=')[0] == 'files[]'){
				$('[value='+this.split('=')[1].replace(/\./g, "\\.")+']').attr('checked', true);
			}
			//set version radios
			else if(this.split('=')[0] == 'ui-version'){
				$('input[name=ui-version][value='+this.split('=')[1]+']').attr('checked', true);
			}
		});
	}
	else if( !$.cookie('downloadBuilderTheme') ) {
		$('div.download-builder-header .select-all:contains(Select all)').trigger('click');
	}
	updateSelectAllLinks();
	//set theme select to cookie val if not provided in url
	
	if($.cookie('downloadBuilderTheme') && window.location.search.indexOf('themeParams=') <= -1 ){
		$('#theme option:contains('+ unescape($.cookie('downloadBuilderTheme')) +')').attr('selected', 'selected');
	}
	updateFilesize();
	
}

//normalize theme hrefs for comparison
function cleanThemeVal(href){
	href = unescape(href);
	href = href.split(' ').join('').split('+').join('');//could be optimized
	return href;
}
//if a custom theme matches one already on the page, kill it
function checkForDuplicateThemes(){
	var customVal = cleanThemeVal( $('#theme option:eq(1)').attr('value') );
	$('#theme option:gt(1)').each(function(){
		var thisVal = cleanThemeVal( $(this).attr('value') );
		if( thisVal == customVal ) {
			if($('#theme')[0].selectedIndex == 1){
				$(this).attr('selected', true);
			}
			$('#theme option:eq(1)').remove();
		}
	});
}

function setThemeFolderName(){
	if( (!$('#t-name').data('edited') && !$('#t-name').data('suggestedEdit')) || $('#t-name').val() == '' ){
		var themeName = $('#theme option:eq('+ $('#theme')[0].selectedIndex +')').text().split(' ').join('-').toLowerCase();
		$('#t-name').val(themeName);
	}

}

$(document).ready(function() {
	//remove a theme gallery custom theme
	checkForDuplicateThemes();
	setThemeFolderName();

	//advanced theme settings behaviors
	$('.field-help-content').hide();
	$('.field-help-link').each(function(){
		var that = this;
		var thisDialog = $($(that).attr('href') ).dialog({
			autoOpen: false,
			title: $(that).parent().text(),
			modal: true
		});
		$(that).click(function(){
			thisDialog.dialog('open');
			return false;
		});
	});
	$('#scope').keyup(function(){
		if(!$('#t-name').data('edited')){
			$('#t-name').data('suggestedEdit', true);
			$('#t-name').val(escape($(this).val().split(' ').join('-').toLowerCase().replace('.', '').replace('#', '')) );
		}
	});	
	
	$('#t-name').keyup(function(){
		$(this).data('edited', true);
		$('#t-name').removeData('suggestedEdit');
		$(this).val( escape($(this).val().replace(' ', '-').split(' ').join('-').toLowerCase().replace('.', '').replace('#', '')));
	});
	$('#t-name').blur(function(){
		if($(this).val() == ''){ $('#t-name').removeData('edited'); }
	});
	$('.advanced-settings-heading').click(function(){
			$(this).next().slideToggle();	
			$(this).find('span').toggleClass('ui-icon-triangle-1-s');
	})
	.prepend('<span class="ui-icon ui-icon-triangle-1-e"></span>')
	.next().hide();
		
	//Append filesize setting box
	//$('#download-builder-settings > div:eq(2)').before('<div id="filesize" class="download-builder-settings-group"><h2>Total Filesize</h2><p>The size of the bundled files in the package will be approximately:</p><p class="filesize-info">0kb <em>uncompressed</em></p><p class="filesize-info">0kb <em>minified</em></p></div>');
	
	//check if any widgets should be disabled
	compatVersions();

    $('select#theme').bind('click change', function(){
        setThemeFolderName();
    });

    function formChanged()
    {
		if( $('input[type="checkbox"]:checked').size() > 0 || $('#theme')[0].selectedIndex > 0 ){
			enableDownload();
		}
		else{
			disableDownload();
		}
		if($('#theme')[0].selectedIndex > 0){
			$('.advanced-settings:hidden').slideDown();
		}
		else {
			$('.advanced-settings:visible').slideUp();
		}
		
		updateSelectAllLinks();
		compatVersions();
		updateFilesize();
		setThemeFolderName();
		$.cookie('downloadBuilderInputs', null);
		$.cookie('downloadBuilderInputs', $('#download-builder-components input').serialize() );
		$.cookie('downloadBuilderTheme', null);
		$.cookie('downloadBuilderTheme', $('#theme option:selected').text() );
    }

	$(':checkbox, :radio').click( function(){
	    formChanged();
	})

	$('#download_zip').bind('click', function(event) {
		return $(this).attr('disabled') != 'false';
	});	
	
	//Selected components
	$('div.download-builder-header h2').html('Components <em class="components-selected">(0 of '+(getTotalCount())+' selected)</em>');
	
	//Select all link
	$('div.download-builder-header').append('<a href="#" class="select-all">Select all components</a>');
	$('div.download-builder-header a.select-all').bind('click', function() {
		if(this.innerHTML.indexOf('Deselect') != -1) {
			$('#download-builder-components input[type=checkbox]').attr('checked', false);
			if( window.location.search.indexOf('themeParams=') <= -1 ){
				$("select#theme")[0].selectedIndex = 0;	
			}
			this.innerHTML = "Select all components";
		} else {
			$('#download-builder-components input[type=checkbox]').attr('checked', true);

				if($("select#theme")[0].selectedIndex == 0){
					$("select#theme")[0].selectedIndex = 1;
				}	
			
			this.innerHTML = "Deselect all components";
		}
		
		updateFilesize();

		// $('form').trigger('change');
        formChanged();

		return false;

	});
	
	//Select all category
	$('fieldset.component-group-list:not(#core-component-group fieldset)').prepend('<a href="#" class="select-all">Select all</a>');
	$('fieldset a.select-all').bind('click', function() {
		
		if(this.innerHTML.indexOf('Deselect') != -1) {
			var resolved = $('input[type=checkbox]', this.parentNode).attr('checked', false).resolveDependencies();
			$(this).text('Select all');
		} else {
			$('input[type=checkbox]', this.parentNode).attr('checked', true).addMissingDependencies();
			$(this).text('Deselect all');
		}
		
		updateSelectAllLinks();
		updateFilesize();
		
		return false;

	});	
	
	//Bind event to checkboxes
	$('#download-builder-components input[type=checkbox]')
		.attr('checked', false)
		.bind($.browser.msie ? 'click' : 'change', function(event) {
		
			//If it has been unchecked, recheck if it's a needed dependency for something
			if(!this.checked) {
				$(this).resolveDependencies();
			}
					
			//Add missing dependencies for this item
			$(this).addMissingDependencies();
			
			updateFilesize();
			
		});
		
		//$('form').trigger('change');
		setFormFields();
		
		if($('#theme')[0].selectedIndex == 0){
			$('.advanced-settings').hide();
		}
		
		formChanged();
	
	$(".themes-link").click(function() {
		$($(this).attr("href")).slideToggle();
		return false;
	});
});

jQuery.cookie = function(name, value, options) {
    if (typeof value != 'undefined') { // name and value given, set cookie
        options = options || {};
        if (value === null) {
            value = '';
            options.expires = -1;
        }
        var expires = '';
        if (options.expires && (typeof options.expires == 'number' || options.expires.toUTCString)) {
            var date;
            if (typeof options.expires == 'number') {
                date = new Date();
                date.setTime(date.getTime() + (options.expires * 24 * 60 * 60 * 1000));
            } else {
                date = options.expires;
            }
            expires = '; expires=' + date.toUTCString(); // use expires attribute, max-age is not supported by IE
        }
        // CAUTION: Needed to parenthesize options.path and options.domain
        // in the following expressions, otherwise they evaluate to undefined
        // in the packed version for some reason...
        var path = options.path ? '; path=' + (options.path) : '';
        var domain = options.domain ? '; domain=' + (options.domain) : '';
        var secure = options.secure ? '; secure' : '';
        document.cookie = [name, '=', encodeURIComponent(value), expires, path, domain, secure].join('');
    } else { // only name given, get cookie
        var cookieValue = null;
        if (document.cookie && document.cookie != '') {
            var cookies = document.cookie.split(';');
            for (var i = 0; i < cookies.length; i++) {
                var cookie = jQuery.trim(cookies[i]);
                // Does this cookie string begin with the name we want?
                if (cookie.substring(0, name.length + 1) == (name + '=')) {
                    cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                    break;
                }
            }
        }
        return cookieValue;
    }
};

