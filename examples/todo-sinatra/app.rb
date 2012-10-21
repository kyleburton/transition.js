# A Port of the EngineYard Todo App to Sinatra 1.3 by Steven! Ragnarök.

# Require YAML to read the config file.
require "yaml"

# Use Bundler for dependency management.
require "bundler"
Bundler.require

# Require models.
require_relative "models/list"
require_relative "models/task"

# The entire application is nested within the `Todo` module.
module Todo

  # Setup environment and connect to the database.
  RACK_ENV = ENV['RACK_ENV'] || "development"
  DB_SETTINGS = YAML.load_file("config/database.yml")[RACK_ENV]
  ActiveRecord::Base.establish_connection(DB_SETTINGS)

  # The main Sinatra Application. This is the app that is run in `config.ru`.
  class App < Sinatra::Base

    # Use Erubis for template compilation. Essentially a faster ERB.
    Tilt.register :erb, Tilt[:erubis]

    ## GET /
    # Entry point for the application. Displays the main page. Which is a tabbed
    # set of lists with a new list tab. The first list's tasks are displayed as
    # well.
    get "/" do
      @lists = List.all
      erb :show_tasks
    end

    ## GET /lists/:list_id
    # This renders the same page as root but allows you to specify which list
    # is shown first. Doing this is kind of hacky, I'd like to have this get
    # request, but redirect it to root with an anchor link specifying which tab
    # should be shown. However, the tabbing library being used for the project
    # doesn't pick up on the anchor link itself, but rather appears to intercept
    # them. I would have to find a library which fixes this or fix it myself to
    # get the desired behavior. So for now I'll imitate the behavior of the
    # Rails 3 app.
    get "/lists/:list_id" do
      @lists = List.all
      @selected_list_index = @lists.index { |l| l.id == params[:list_id].to_i }
      erb :show_tasks
    end

    ## POST /lists
    # Create a new list with the given name, then return to `/`.
    # ## Parameters of `list`.
    # - `name`: The name of the list to create.
    post "/lists" do
      List.create(:name => params[:list][:name])
      redirect "/"
    end


    ## DELETE /lists/:list_id
    # Delete the list with the given id.
    delete "/lists/:list_id" do
      List.find_by_id(params[:list_id]).destroy
      redirect "/"
    end

    ## POST /lists/:list_id
    # This is primarily a proxy for browser deletion. It does not currently have
    # any other function.
    post "/lists/:list_id" do
      # 
      if params[:_method] == "delete"
        List.find_by_id(params[:list_id]).destroy
        redirect "/"
      end
    end

    ## POST /lists/:list_id/tasks
    # Create a new task with the given name, then return to the correct tab of
    # '/'.
    # ## Parameters of `task`.
    # - `name`: The name of the task. For example, "Walk the pug".
    # - `list_id`: The unique identifier of the list to which the task should be
    #   added.
    # - `completed`: The truth value of the task's competion status.
    post "/lists/:list_id/tasks" do
      @task = Task.create :name => params[:task][:name]
      List.find_by_id(params[:list_id]).add_task @task
      redirect "/lists/#{params[:list_id]}"
    end

    ## DELETE /lists/:list_id/tasks/:task_id
    # Delete the specified task from the list and return to root.
    delete "/lists/:list_id/tasks/:task_id" do
      List.find_by_id(params[:list_id]).remove_task(
        Task.find_by_id(params[:task_id])).destroy

      redirect "/lists/#{params[:list_id]}"
    end

    ## POST /lists/:list_id/tasks/:task_id
    # This endpoint serves the dual purpose of acting as a proxy for the DELETE
    # verb in browsers, as well as updating individual tasks acting as the PUT
    # verb for updating the task's completion status.
    post "/lists/:list_id/tasks/:task_id" do
      if params[:_method] == "delete"
        List.find_by_id(params[:list_id]).remove_task(
          Task.find_by_id(params[:task_id])).destroy
      else
        task = Task.find_by_id(params[:task_id])
        if params[:task][:done]
          task.complete!
        else
          task.uncomplete!
        end
      end

      redirect "/lists/#{params[:list_id]}"
    end
  end
end

