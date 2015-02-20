module Spontaneous::Media
  module Image
    class Attributes
      include Renderable

      attr_reader  :storage, :width, :height, :filesize, :filepath, :storage_name, :storage

      def initialize(site, params={})
        params ||= {}
        @storage = site.storage(params[:storage_name])
        @src, @width, @height, @filesize, @filepath = params.values_at(:src, :width, :height, :filesize, :path)
      end

      def serialize
        { src: src, width: width, height: height, filesize: filesize, storage_name: storage_name }
      end

      def inspect
        %(<#{self.class.name}: src=#{src.inspect} width="#{width}" height="#{height}">)
      end

      def blank?
        src.blank?
      end

      def src
        storage.to_url(@src)
      end

      alias_method :url, :src

      # Will only work for files in local storage
      def filepath
        Spontaneous::Media.to_filepath(src)
      end

      alias_method :empty?, :blank?

      def value(format = :html)
        src
      end
    end
  end
end
