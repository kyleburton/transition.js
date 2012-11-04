require 'rubygems'
require 'fileutils'
require 'colorize'

def chdir! path
  unless File.exist? path
    FileUtils.mkdir_p path
  end 
  Dir.chdir(path) do |p| 
    yield p
  end 
end

PHANTOM_CONFIG = {
  "Linux" => {
    :x64 => "http://phantomjs.googlecode.com/files/phantomjs-1.7.0-linux-i686.tar.bz2",
    :x32 => "http://phantomjs.googlecode.com/files/phantomjs-1.7.0-linux-x86_64.tar.bz2"
  }
}
PHANTOM_URL = "http://phantomjs.googlecode.com/files/phantomjs-1.7.0-source.zip"
PHANTOM_DIR = "phantomjs-1.7.0"

def phantom_url
  sys = `uname`.chomp!
  PHANTOM_URLS[sys]
end

def install_phantom
  chdir!("software") do
    phantom_pkg = PHANTOM_URL
    unless File.exist? File.basename(PHANTOM_URL)
      system "wget", PHANTOM_URL
    end

    unless File.exist? PHANTOM_DIR
      system "unzip", File.basename(PHANTOM_URL)
    end

    Dir.chdir(PHANTOM_DIR) do |p|
      system "bash", "build.sh"
    end

  end
end


desc "run jslintrb on js files"
task :lint do
  %w[examples/todo-sinatra/public/test-suite.js].concat(Dir["public/js/transition*.js"]).each do |f|
    puts "jslintrb: #{f}"
    res = system "jslintrb", f
    unless res
      $stderr.puts "JSLINT FAILED: #{f}".red
    end
  end
end

namespace :jslint do
  desc "watch a file" 
  task :watch, :file do |t,args|
    system "watch", "-d", "-n2", "jslintrb", args[:file]
  end
end

namespace :test do
  desc "run stats collector" 
  task :stats  do 
    system('ruby stats.rb')
  end


end
namespace :phantom do
  desc "install"
  task :install do
    install_phantom
  end
end

namespace :twitter_bootstrap do
  desc "download"
  task :download do
    unless File.exist? "software"
      Dir.mkdir "software"
    end
    Dir.chdir "software" do
      tbs_url = "http://twitter.github.com/bootstrap/assets/bootstrap.zip"
      unless File.exist? File.basename(tbs_url)
        system "wget", tbs_url
      end
      unless File.exist? "bootstrap"
        system "unzip", File.basename(tbs_url)
      end
    end
  end
end

desc "Run the TODO application"
task :todo do
  Dir.chdir("examples/todo-sinatra") do
    system "bundle", "install"
    system "rake", "db:migrate"
    system "rake", "rerun"
  end
end
