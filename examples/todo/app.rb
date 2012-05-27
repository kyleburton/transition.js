require 'rubygems'
require 'bundler'
require 'sinatra'
require 'sinatra/reloader'
require 'json'
require 'pp'

Bundler.require

module Todo
  class App < Sinatra::Base
    enable :sessions

    configure :development do
      register Sinatra::Reloader
    end

    def read_file fname
      if fname.end_with? ".js"
        content_type :js
      end
      File.open(fname,'rb') do |f|
        f.read
      end
    end

    def respond_json thing={}
      content_type :json
      thing.to_json
    end

    get '/' do
      erb :index
    end

    get %r{^/(.+)$} do
      fname  = "./" + params[:captures].first
      ifname = "#{fname}/index.html"
      puts "LOOKING FOR: #{fname} or #{ifname}"
      return read_file fname  if File.file? fname
      return read_file ifname if File.file? ifname
      pass
    end

    get %r{/(.+)(?:/|.html)?} do
      vname = params[:captures].first
      fname = "views/#{vname}.erb"
      return pass unless File.exist? fname
      erb vname.to_sym
    end

    get %r{/(.+).html} do
      vname = params[:captures].first
      fname = "views/#{vname}.erb"
      return pass unless File.exist? fname
      erb vname.to_sym
    end

    get %r{/js/(transition-.+)} do
      fname = "../../public/js/#{params[:captures].first}"
      content_type 'application/javascript'
      return pass unless File.exist? fname
      File.open(fname,'rb') do |f|
        f.read
      end
    end

    delete '/session' do
      respond_json :status => 'OK'
    end

    post '/session' do
      req = JSON.parse request.body.read
      puts "DATA: #{req.inspect}"
      if req['password'] == 'secret'
        session[:email] = req['email']
        return respond_json :status => 'OK'
      end
      respond_json :status => 'NotAuthorized'
    end

  end
end

Todo::App.run!
# exit 0
