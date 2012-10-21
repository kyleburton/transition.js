module Todo
  ## ActiveRecord Task Model
  #### Schema ###
  # - `id`: `Integer`, Primary Key
  # - `name`: `String`
  # - `list_id`: Integer, Foreign Key referencing List.
  # - `created_at`: `Timestamp`
  # - `updated_at`: `Timestamp`
  class Task < ActiveRecord::Base
    belongs_to :list

    def completed?
      completed_at != nil
    end

    def complete!
      update_attributes :completed_at => Time.now
    end

    def uncomplete!
      update_attributes :completed_at => nil
    end

    ## Named Scopes.
    #
    # For a while, I preferred writing class methods rather than named scopes
    # since I could see no effective difference between the two and class
    # methods are ORM agnostic. I've since realized that the big win of named
    # scopes over class methods is that named scopes work on relations whereas
    # class methods work only on the global task object. If named scopes didn't
    # exist, it would still be possible to use class methods to achieve the same
    # result (by allowing the class method to take a block or lambda argument
    # passed to Enumerable#select) but some of the object-oriented style is lost
    # in that translation.
    scope :unfinished, where(:completed_at => nil)
    scope :completed, where("completed_at IS NOT NULL")
  end
end

