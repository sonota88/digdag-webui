require "logger"

class StderrLogger < ::Logger
  def write(msg)
    self << msg
  end

  def puts(*args)
    args.each do |arg|
      self << arg
      self << "\n"
    end
  end

  def flush
    super.flush
  end
end

if ENV["APP_ENV"] == "production"
  $stderr = StderrLogger.new(
    File.join(__dir__, "z_stderr.log"),
    5,
    1024 * 1024
  )
end

require "./app.rb"

run Sinatra::Application
