Getting Things Done With EngineYard AppCloud: Sinatra Edition
============================================================

Getting It
----------

Clone it using Git.

`git clone git://github.com/nuclearsandwich/ey_todo-sinatra.git` (Coming Soon)

After running `bundle install`, copy `config/database.template.yml` to
`config/database.yml` and modify it to suite your local environment. Then run
`bin/rake db:migrate` and `RACK_ENV=test bin/rake db:migrate` to create
development and test databases.

Running It
----------

After cloning the project, running `bundle install` and setting up the local
databases, you can start the app with `bin/rake run`.

If you want to restart on every code change, you can use the `bin/rake rerun`
task.

Testing It
----------

Tests are run with the default rake task. You can run them explicitly using
`rake test`.

For continuous testing, the   `bin/rake rerun:test` command also exists.

Deploying It
------------

Coming soon.

Differences from the Rails 3 App
--------------------------------

- Links are not highlighted in task names.

Sinatra lacks the auto_link helper and vendorizing it proved non-trivial. I plan
to add it as I work on more of these ports.

- This one has unit tests, Cucumber acceptance tests are on the way.
