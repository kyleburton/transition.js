require "minitest/unit"
require "minitest/autorun"
require "minitest/pride"
require "require_relative" if RUBY_VERSION =~ /1.8/
require_relative "../../app"

include Todo

class ListTest < MiniTest::Unit::TestCase
  def setup
    @list = List.new :name => "Secret Mission"
    current_time = Time.now
    @completed_tasks = (1..4).map do |i|
      Task.new :name => "Completed Task ##{i}", :completed_at => current_time
    end
    @unfinished_tasks = (1..3).map do |i|
      Task.new :name => "Unfinished Task ##{i}"
    end
  end

  def test_list_creation
    assert @list, "No list was created."
  end

  def test_list_has_name
    assert_equal "Secret Mission", @list.name
  end

  def test_list_can_add_tasks
    task = @completed_tasks.first
    @list.add_task task
    assert_includes @list.tasks, task
  end

  def test_list_can_remove_tasks
    task = @completed_tasks.first
    @list.add_task task

    @list.remove_task task
    refute_includes @list.tasks, task
  end

  def test_completed_tasks_contains_only_completed_tasks
    (@completed_tasks + @unfinished_tasks).each do |t|
      @list.add_task t
    end
    assert @list.completed_tasks.all?(&:completed?),
      "Incomplete task found in completed_tasks"
  end

  def test_unfinished_tasks_contains_no_completed_tasks
    (@completed_tasks + @unfinished_tasks).each do |t|
      @list.add_task t
    end
    refute @list.unfinished_tasks.any?(&:completed?),
      "Completed task found in unfinished_tasks"
  end
end

