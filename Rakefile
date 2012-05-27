require 'rubygems'
require 'fileutils'

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
