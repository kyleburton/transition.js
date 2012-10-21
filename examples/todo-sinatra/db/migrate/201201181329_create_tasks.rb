class CreateTasks < ActiveRecord::Migration
  def change
    create_table :tasks do |t|
      t.references :list
      t.string :name
      t.timestamp :completed_at
      t.timestamps
    end
  end
end
