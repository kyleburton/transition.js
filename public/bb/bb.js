(function () {
  var root = this,
      BB = {},
      Views, Models, views, models,
      tmpl = Transition.tmpl;

  root.BB = BB;
  BB.tmpl = Transition.tmpl;

  BB.Views  = Views  = {};
  BB.views  = views  = {};
  BB.Models = Models = {};
  BB.models = models = {};

  ////////////////////////////////////////////////////////////
  // Views
  Views.Navbar = Backbone.View.extend({
    templateId: 'navbar-tmpl',

    events: {
      'click a.dropdown-toggle':  'toggleDropdownMenu',
      'click .dropdown-menu a':   'menuItemClicked'
    },

    initialize: function () {
      this.constructor.__super__.initialize.apply(this, []);
    },

    menuItemClicked: function (evt) {
      var target = $(evt.target),
          item = target.attr('data-item'),
          handler = item + 'Clicked';

      console.log('link clicked!');
      this.closeAllMenus();

      if (this[handler]) {
        this[handler](evt);
      }

    },

    actionClicked: function (evt) {
      evt.preventDefault();
      evt.stopPropagation();
      debugger;
    },

    closeAllMenus: function () {
      this.$el.find('.dropdown').removeClass('open');
    },

    toggleDropdownMenu: function (evt) {
      var target = $(evt.target),
          li = target.parent('li');
      console.log('toggleDropdownMenu');

      if (li.hasClass('open')) {
        li.removeClass('open');
        return;
      }

      this.closeAllMenus();
      li.addClass('open');
    },


    //remove: function () {
    //  //models.settings.off('change', this.render, this);
    //  this.$el.remove();
    //},

    render: function () {
      this.$el.html(tmpl(this.templateId, {suite: models.suite}));
      // this.$('.dropdown-toggle').dropdown();
      // DNW = "Does Not Work"
      // DNW: this.$el.find('a').click(this.linkClicked);;
      return this;
    }
  });
  ////////////////////////////////////////////////////////////
  // Models
  Models.ClickTracker = ClickTracker = Backbone.Model.extend({
  });

  BB.init = function () {
    Transition.addView('navBar',           Views.Navbar,           '#example-navbar');
    console.log('Build the UI here');
  };

}.call(this));
