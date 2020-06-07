class ErbContext
  def initialize(params)
    @params = params
  end

  def method_missing(name, *args)
    if @params.key? name
      @params[name]
    else
      raise "unknown key (#{name})"
    end
  end

  def get_binding
    binding
  end

  def self.hash_to_binding(params)
    ErbContext.new(params).get_binding
  end

  def self.render(template, params)
    erb = ERB.new(template)
    erb.result ErbContext.hash_to_binding(params)
  end
end
