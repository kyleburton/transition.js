
require "rake/testtask"

task :default => :test

# The command which runs the app.
RUN_COMMAND = "bin/rackup"

desc "Load the application environment for tasks that require it."
task :environment do
  require "./app"
end

desc "Set the test environment for Rack."
task :test_env do
  ENV["RACK_ENV"] = "test"
end

task :test => :test_env

Rake::TestTask.new do |t|
    t.test_files = FileList["test/**/*.rb"]
end

desc "Regenerate application documentation"
task :docs do
  system "bin/rocco app.rb models/*.rb -o docs"
end

desc "Run the application."
task :run do
  system RUN_COMMAND
end

desc "Run the application under rerun, which will monitor changes and restart."
task :rerun do
  system "bin/rerun -p'./**/*.{rb,ru}' #{RUN_COMMAND}"
end

namespace :rerun do
  desc "Rerun tests rather than the main app."
  task :test do
    system "bin/rerun bin/rake test"
  end
end

desc "Open a pry console within the app context."
task :pry => :environment do
  require "pry"
  Todo.pry
end

namespace :db do
  task :migrate => :environment do
    ActiveRecord::Migrator.migrate("db/migrate")
  end
end

