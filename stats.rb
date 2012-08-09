require 'rubygems'
require 'sinatra'

$stat_file = 'test-stats.tab'
$log_file  = 'test.log'

def write_stat params
  unless File.exists? $stat_file
    File.open($stat_file, 'w') do |f|
      f.puts %w[suite test event startTimeMs elapsedTimeMs completed].join("\t")
    end
  end
  File.open($stat_file,'a') do |f|
    f.puts [ params["suiteName"], params["name"], params["event"], params["startTimeMs"], params["elapsedTimeMs"], params["completed"] ].join("\t")
  end
end

def write_log params
  File.open($log_file,'a') do |f|
    f.puts [ request.ip, request.user_agent, params['msg'] ].join("\t")
  end
end

get '/ping' do
  content_type 'application/javascript'
  %Q|#{params["callback"]}("OK")|
end

get '/l' do
  puts "log: #{params.inspect}"
  write_log params
  content_type 'application/javascript'
  %Q|#{params["callback"]}("OK")|
end

get '*' do
  puts "catch-all: #{params.inspect}"
  write_stat params
  content_type 'application/javascript'
  %Q|#{params["callback"]}("OK")|
end
