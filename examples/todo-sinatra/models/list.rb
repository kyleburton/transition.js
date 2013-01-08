module Todo
  ## ActiveRecord List Model
  #### Schema ###
  # - `id`: `Integer`, Primary Key
  # - `name`: `String`
  # - `created_at`: `Timestamp`
  # - `updated_at`: `Timestamp`
  class List < ActiveRecord::Base
    has_many :tasks

    def add_task task
      tasks << task
      save && task
    end

    def remove_task task
      tasks.delete task
      save && task
    end

    # A collection of all completed tasks.
    def completed_tasks
      tasks.completed
    end

    # A collection of all unfinished tasks.
    def unfinished_tasks
      tasks.unfinished
    end
  end
end

