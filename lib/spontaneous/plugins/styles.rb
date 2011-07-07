# encoding: UTF-8

module Spontaneous::Plugins
  module Styles

    def self.configure(base)
    end

    module ClassMethods
      def style(name, options={})
        name = name.to_sym
        styles[name] = Spontaneous::Prototypes::StylePrototype.new(self, name, options)
      end

      # def styles
      #   @styles ||= []
      # end

      # def all_styles
      #   @all_styles ||= styles.concat(supertype_has_styles? ? supertype.all_styles : [])
      # end

      def style_prototypes
        @style_prototypes ||= Spontaneous::Collections::StyleSet.new(self)
      end

      alias_method :styles, :style_prototypes

      def resolve_style(style_sid)
        if style_sid.blank?
          default_style
        else
          find_style(style_sid)
        end
      end

      def default_style
        if styles.empty?
          style = style_class::Default.new(self)
        else
          style = (style_prototypes.detect { |prototype| prototype.default? } || style_prototypes.first).style(self)
        end
      end

      def style_class
        Spontaneous::Style
      end

      # def styles_for_format(format)
      #   styles.select { |s| s.exists?(format) }
      # end

      # def default_style_class
      #   Spontaneous::Prototypes::StylePrototype::Default
      # end
      # def anonymous_style
      #   Spontaneous::Style::Anonymous.new
      # end

      def find_style(style_sid)
        style_prototypes.sid(style_sid).style(self)
      end

      def find_named_style(style_name)
        # unless style = styles.detect { |s| s.name == style_name }
        #   style = supertype.find_named_style(style_name) if supertype_has_styles?
        # end
        # style
        style_prototypes[style_name.to_sym]
      end

      alias_method :get_style, :find_named_style

      def template(format=:html, template_string=nil)
        if template_string.nil?
          template_string = format
          format = :html
        end
        inline_templates[format.to_sym] = template_string
      end

      def inline_templates
        @inline_templates ||= {}
      end

      # Used to determine the name of the directory under template_root
      # that holds a classe's templates
      # def style_directory_name
      #   return nil if self.name.blank?
      #   self.name.demodulize.underscore
      # end

      # don't want to go right back to Content class to resolve default styles
      # def supertype_has_styles?
      #   supertype? and supertype != Spontaneous::Content
      # end
    end # ClassMethods

    module InstanceMethods

      def style=(style)
        self.style_sid = style_to_schema_id(style)
      end

      # converts a symbol or string into a Schema::UID instance
      def style_to_schema_id(style)
        sid = nil
        if style.respond_to?(:schema_id)
          sid = style.schema_id
        else
          if Spontaneous::Schema::UID === style
            sid = style
          else
            if s = self.find_named_style(style)
              sid = s.schema_id
            end
          end
        end
      end

      def find_named_style(style_name)
        self.class.find_named_style(style_name)
      end

      def style
        resolve_style(self.style_sid)
      end

      def default_style
        self.class.default_style
      end

      def resolve_style(style_sid)
        self.class.resolve_style(style_sid)
      end

      def styles
        self.class.styles
      end

      def template(format = :html)
        style.template(format)
      end


    end # InstanceMethods

  end
end

