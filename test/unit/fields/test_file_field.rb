# encoding: UTF-8

require File.expand_path('../../../test_helper', __FILE__)
require 'fog'

describe "File Fields" do
  let(:path) { File.expand_path("../../../fixtures/images/vimlogo.pdf", __FILE__) }

  def site
    @site = setup_site
    @now = Time.now
    stub_time(@now)
    Spontaneous::State.delete
    @site.background_mode = :immediate
  end
  before do
    site
    assert File.exists?(path), "Test file #{path} does not exist"
    @content_class = Class.new(::Piece)
    @prototype = @content_class.field :file
    @content_class.stubs(:name).returns("ContentClass")
    @instance = @content_class.create
    @field = @instance.file
  end

  after do
    teardown_site
  end
  it "have a distinct editor class" do
    @prototype.instance_class.editor_class.must_equal "Spontaneous.Field.File"
  end

  it "adopt any field called 'file'" do
    assert @field.is_a?(Spontaneous::Field::File), "Field should be an instance of FileField but instead has the following ancestors #{ @prototype.instance_class.ancestors }"
  end

  it "gives the right value for #blank?" do
    @field.blank?.must_equal true
    @field.value = 'http://example.com/image.jpg'
    @field.blank?.must_equal false
  end

  it "copy files to the media folder" do
    File.open(path, 'rb') do |file|
      @field.value = {
        :tempfile => file,
        :type => "application/pdf",
        :filename => "vimlogo.pdf"
      }
    end
    url = @field.value
    path = File.join File.dirname(Spontaneous.media_dir), url
    assert File.exist?(path), "Media file should have been copied into place"
  end

  it "generate the requisite file metadata" do
    File.open(path, 'rb') do |file|
      @field.value = {
        :tempfile => file,
        :type => "application/pdf",
        :filename => "vimlogo.pdf"
      }
    end
    @field.value(:html).must_match %r{/media/.+/vimlogo.pdf$}
    @field.value.must_match %r{/media/.+/vimlogo.pdf$}
    @field.path.must_equal @field.value
    @field.value(:filesize).must_equal 2254
    @field.filesize.must_equal 2254
    @field.value(:filename).must_equal "vimlogo.pdf"
    @field.filename.must_equal "vimlogo.pdf"
  end

  it "just accept the given value if passed a path to a non-existant file" do
    @field.value = "/images/nosuchfile.rtf"
    @field.value.must_equal  "/images/nosuchfile.rtf"
    @field.filename.must_equal "nosuchfile.rtf"
    @field.filesize.must_equal 0
  end

  it "copy the given file if passed a path to an existing file" do
    @field.value = path
    @field.value.must_match %r{/media/.+/vimlogo.pdf$}
    @field.filename.must_equal "vimlogo.pdf"
    @field.filesize.must_equal 2254
  end

  it "sets the unprocessed value to a JSON encoded array of MD5 hash & filename" do
    @field.value = path
    @instance.save
    @field.unprocessed_value.must_equal ["vimlogo.pdf", "1de7e866d69c2f56b4a3f59ed1c98b74"].to_json
  end

  it "sets the field hash to the MD5 hash of the file" do
    @field.value = path
    @field.file_hash.must_equal "1de7e866d69c2f56b4a3f59ed1c98b74"
  end

  it "sets the original filename of the file" do
    @field.value = path
    @field.original_filename.must_equal "vimlogo.pdf"
  end

  it "doesn't set the hash of a file that can't be found" do
    @field.value = "/images/nosuchfile.rtf"
    @field.file_hash.must_equal ""
  end

  it "sets the original filename of a file that can't be found" do
    @field.value = "/images/nosuchfile.rtf"
    @field.original_filename.must_equal "/images/nosuchfile.rtf"
  end

  describe "clearing" do
    def assert_file_field_empty
      @field.value.must_equal ''
      @field.filename.must_equal ''
      @field.filesize.must_equal 0
    end

    before do
      path = File.expand_path("../../fixtures/images/vimlogo.pdf", __FILE__)
      @field.value = path
    end

    it "clears the value if set to the empty string" do
      @field.value = ''
      assert_file_field_empty
    end
  end

  describe "with cloud storage" do
    before do
      ::Fog.mock!
      @aws_credentials = {
        :provider=>"AWS",
        :aws_secret_access_key=>"SECRET_ACCESS_KEY",
        :aws_access_key_id=>"ACCESS_KEY_ID"
      }
      @storage = S::Media::Store::Cloud.new(@aws_credentials, "media.example.com")
      @site.expects(:storage).returns(@storage)
    end

    it "sets the content-disposition header if defined as an 'attachment'" do
      prototype = @content_class.field :attachment, :file, attachment: true
      field = @instance.attachment
      path = File.expand_path("../../../fixtures/images/vimlogo.pdf", __FILE__)
      @storage.expects(:copy).with(path, is_a(Array), { content_type: "application/pdf", content_disposition: 'attachment; filename=vimlogo.pdf'})
      field.value = path
    end
  end
end
