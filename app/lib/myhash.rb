class Myhash

  def initialize(hash)
    @h = hash
  end

  def self._to_plain_array(xs)
    xs.map{ |x|
      if x.is_a? Myhash
        x.to_plain
      elsif x.is_a? Array
        Myhash._to_plain_array(x)
      else
        x
      end
    }
  end

  def to_plain
    new_h = {}

    @h.each{ |k, v|
      new_v =
        if v.is_a? Myhash
          v.to_plain
        elsif v.is_a? Array
          Myhash._to_plain_array(v)
        else
          v
        end
      new_h[k] = new_v
    }

    new_h
  end

  def to_sym_key()
    new_h = {}

    @h.each do |k, v|
      new_v =
        if v.is_a? Hash
          Myhash.to_sym_key(v)
        else
          v
        end

      new_k =
        if k.is_a? String
          k.to_sym
        else
          k
        end

      new_h[new_k] = new_v
    end

    Myhash.new(new_h)
  end

  def self.to_sym_key(hash)
    Myhash.new(hash)
      .to_sym_key
      .to_plain
  end

  # to snake case
  def self._to_snake(arg)
    is_sym = arg.is_a?(Symbol)

    s = is_sym ? arg.to_s : arg

    new_s = s.chars
      .map do |c|
        if /^[A-Z]$/ =~ c
          "_" + c.downcase
        else
          c
        end
      end
      .join("")

    is_sym ? new_s.to_sym : new_s
  end

  def self._to_snake_array(xs)
    xs.map{ |x|
      if x.is_a? Hash
        Myhash.new(x).to_snake
      elsif x.is_a? Array
        Myhash._to_snake_array(x)
      else
        x
      end
    }
  end

  def to_snake
    new_h = {}
    @h.each{ |k, v|
      new_k = Myhash._to_snake(k)

      new_v =
        if v.is_a? Hash
          Myhash.new(v).to_snake
        elsif v.is_a? Array
          Myhash._to_snake_array(v)
        else
          v
        end

      new_h[new_k] = new_v
    }

    Myhash.new(new_h)
  end

  # to lower camel case
  def self._to_lcc(arg)
    is_sym = arg.is_a?(Symbol)

    s = is_sym ? arg.to_s : arg

    words = s.split("_")

    new_s =
      words[0] +
      words[1..-1]
        .map{ |word| word.capitalize }
        .join("")

    is_sym ? new_s.to_sym : new_s
  end

  def self._to_lcc_array(xs)
    xs.map{ |x|
      if x.is_a? Hash
        Myhash.new(x).to_lcc
      elsif x.is_a? Array
        Myhash._to_lcc_array(x)
      else
        x
      end
    }
  end

  def to_lcc
    new_h = {}
    @h.each{ |k, v|
      new_k = Myhash._to_lcc(k)

      new_v =
        if v.is_a? Hash
          Myhash.new(v).to_lcc
        elsif v.is_a? Array
          Myhash._to_lcc_array(v)
        else
          v
        end

      new_h[new_k] = new_v
    }

    Myhash.new(new_h)
  end

  def method_missing(name)
    unless @h.key? name.to_sym
      raise "key not found (#{name}) (#{ @h.inspect })"
    end
    val = @h[name.to_sym]

    if val.is_a? Hash
      Myhash.new(val)
    else
      val
    end
  end

end

if $0 == __FILE__
  require 'pp'

  hash = {
    :aa => [
      [7, 8], # array in array
      { :bb_cc => 1 }, # obj in array
      { :dd_ee => [
          { :ff_gg => 2 },
          { :hh_ii => 3 }
        ]
      }
    ],
    :jj_kk => {
      :ll_mm => 456, # obj in obj
      :nn_oo => [ # array in obj
        { :pp_qq => 9 }
      ]
    }
  }

  lcc = Myhash.new(hash)
        .to_lcc
        .to_plain

  pp lcc

  snake = Myhash.new(lcc)
          .to_snake
          .to_plain

  pp snake
end
