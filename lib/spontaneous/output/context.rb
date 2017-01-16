
module Spontaneous::Output::Context
  autoload :RenderCache, 'spontaneous/output/context/render_cache'
  autoload :Navigation,  'spontaneous/output/context/navigation'
  autoload :Assets,      'spontaneous/output/context/assets'

  module ContextCore
    include RenderCache
    include Navigation
    include Assets

    attr_accessor :__output, :_renderer, :site


    def page
      __target.page
    end

    def live?
      Spontaneous.production? && publishing?
    end

    def show_errors?
      Spontaneous.development?
    end

    def development?
      Spontaneous.development?
    end

    def root
      site.home
    end

    def home
      site.home
    end

    def publishing?
      false
    end

    def each
      content.each { |c| yield(c) } if block_given?
    end

    def each_with_index
      content.each_with_index { |c, i| yield(c, i) } if block_given?
    end

    def map
      content.map { |c| yield(c) } if block_given?
    end

    def this
      __target
    end

    def content
      __target.iterable
    end

    def pieces
      content
    end

    def render_content
      __target.map do |c|
        __render_content(c)
      end.reject(&:blank?).join("\n")
    end

    def first
      content.first
    end

    def last
      content.last
    end

    # template takes an existing first-pass template, converts it to a second pass template
    # and then returns the result for inclusion.
    # This lets you share templates between the publish step and the request step.
    # Useful for things like search results where you want to list the results using the same
    # layout that you used in the static list
    def template(template_path)
      __loader.template(template_path).convert(Spontaneous::Output::Template::RequestSyntax)
    end

    # 'defer' is a useful semantic way of calling 'template'
    alias_method :defer, :template

    def __format
      __loader.format
    end

    def __decode_params(param, coerce = true)
      return param if param.is_a?(String)
      # The `to_renderable` interface allows for plain arrays to upgrade
      # themselves to something 'renderable' but this is dangerous so we
      # allow for it to be turned off.
      if coerce && param.respond_to?(:to_renderable) && (renderable = param.to_renderable)
        return __decode_params(renderable)
      end
      if param.respond_to?(:render)
        param = __render_content(param) #render(param, param.template)
      end
      param
    end

    RENDER_METHODS = [:render_inline_using, :render_using, :render_inline, :render].freeze

    # Has to be routed through the top-level renderer so as to make
    # use of shared caches that are held by it.
    def __render_content(content)
      case (method = RENDER_METHODS.detect { |m| content.respond_to?(m) })
      # use #__send__ to ensure that the method goes to any Renderable proxy object directly
      when :render_inline_using, :render_using
        content.__send__(method, _renderer, __format, {}, self)
      when :render_inline, :render
        content.__send__(method, __format, {}, self)
      else # fallback to showing nothing
        ""
      end
    end
  end

  module PublishContext

    def root
      _with_render_cache("site.root") do
        super
      end
    end

    def site_page(path)
      _with_render_cache("site_page.#{path}") do
        super
      end
    end

    def scripts(*scripts)
      _with_render_cache(scripts.join(",")) do
        super
      end
    end

    def stylesheets(*stylesheets)
      _with_render_cache(stylesheets.join(",")) do
        super
      end
    end

    def __pages_at_depth(origin_page, depth, opts = {})
      _with_render_cache("pages_at_depth.#{origin_page.id}.#{depth}") do
        super
      end
    end

    def publishing?
      true
    end
  end

  module PreviewContext
  end

  module RequestContext
  end
end
