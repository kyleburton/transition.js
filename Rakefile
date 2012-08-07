require 'rubygems'
require 'fileutils'

def chdir! path
  unless File.exist? path
    FileUtils.mkdir_p path
  end 
  Dir.chdir(path) do |p| 
    yield p
  end 
end

PHANTOM_URLS = {
  "Linux" => {
    :url => "http://phantomjs.googlecode.com/files/phantomjs-1.5.0-linux-x86_64-dynamic.tar.gz",
    :dir => "phantomjs-1.5.0",
    :sha1 => "137113dbb25dcd7cf4e19f70c05c11ed8f258b24" 
  },
  "Darwin" => {
    :url => "http://phantomjs.googlecode.com/files/phantomjs-1.5.0-macosx-static.zip",
    :dir => "phantomjs-1.5.0",
    :sha1 => "b87152ce691e7ed1937d30f86bc706a408d47f64"
  }
}

def phantom_url
  sys = `uname`.chomp!
  PHANTOM_URLS[sys]
end

def install_phantom
  chdir!("software") do
    phantom_pkg = phantom_url
    unless File.exist? File.basename(phantom_pkg[:url])
      system "wget", phantom_pkg[:url]
    end

    unless File.exist? phantom_pkg[:dir]
      system "unzip", File.basename(phantom_pkg[:url])
    end
  end
end


desc "run jslintrb on js files"
task :lint do
  Dir["public/js/*.js"].each do |f|
    system "jslint", f
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
