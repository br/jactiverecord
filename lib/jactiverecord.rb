# JActiveRecord

module JActiveRecord # :nodoc:

  module ActMethods

    # Calling jactiverecord overwrites the ActiveRecord model's to_json method, allowing for a fine tuned control over what is returned.
    #
    # ==== Examples
    # 
    # jactiverecord :base =>  [:author_id, :teaser, :created_at, :hit_count, :page_count, :show_full, :feed_article_url, :updated_at, :comments_count, :title, :body, :has_been_star_rated, :author, :tags, :primary_image],
    #             :access_levels => { 
    #               :editor => [:revision_number, :last_editing_at, :last_editor_id, :feedbacks_count, :regular_edited, :trusted_edited, :admin_edited],
    #               :admin => :all
    #             },
    #             :optional => [:comments]
    def jactiverecord(options = {})

      extend ClassMethods unless (class << self; included_modules; end).include?(ClassMethods)
      include InstanceMethods unless included_modules.include?(InstanceMethods)
      
      self.config_jactiverecord_options = options

    end
    
  end

  module ClassMethods
    
    def self.extended(base)
      base.class_inheritable_accessor :config_jactiverecord_options
    end
    
    def self.is_jactiverecord?
      true
    end

  end

  module InstanceMethods
  
    # alias :original_to_json :to_json 
    #     
    #     def to_json(access_level = :false, options = {})
    #       _public_display(access_level).to_json
    #     end
    
    #SPECIFIC TO BLEACHERREPORT
    def public_display(role_id)
      
      access_level = case role_id
      when 0
        access_level = :false
      when 1,3
        access_level = :editor
      when 2
        access_level = :admin
      end
      
      _public_display(access_level, {}, 0)
      
    end
    
    
    def _public_display(access_level = :false, options = {}, depth = 0)
      _hash = {}
      _merge = {}

      _hash = get_hash(config_jactiverecord_options[:base], access_level, options, depth)
      
      if config_jactiverecord_options[:access_levels][access_level]
        if config_jactiverecord_options[:access_levels][access_level] == :all
          _merge = self.attributes
        else
          _merge = get_hash(config_jactiverecord_options[:access_levels][access_level], access_level, options, depth)
        end
      end
      
      _hash["id"] = self.id
      
      return _hash.merge(_merge)
    end
    
    private
      
      def get_hash(list, access_level = :false, options = {}, depth = 0)
        
        _hash = {}
        
        list.each do |key|
          
          if self.respond_to?(key) && !(!self.attributes.include?(key.to_s) && self.class.column_names.include?(key.to_s)) && depth < 2

            _value = self.send(key)

            if _value.class.respond_to?(:superclass) && _value.class.superclass == ActiveRecord::Base

              if _value.respond_to?(:config_jactiverecord_options) && _value.respond_to?(:public_display)
                # checks if it is a ActiveRecord model that has been configured for JActiveRecord
                
                _hash[key.to_s] = _value._public_display(access_level, options, depth + 1)

              end

            elsif _value.class == Array
              # loops trough the array
              
              _array = []
              
              _value.each do |v|
                
                if v.respond_to?(:config_jactiverecord_options) && v.respond_to?(:public_display)
                  # checks if it is a ActiveRecord model that has been configured for JActiveRecord

                  _array << v._public_display(access_level, options, depth + 1)

                elsif depth < 2
                  
                  if v.class.respond_to?(:superclass) && v.class.superclass == ActiveRecord::Base
                  
                    _array << v.attributes
                  
                  else
                    
                    _array << v
                  
                  end
                  
                end
                
                _hash[key.to_s] = _array
                
              end
              
              
            else
              _hash[key.to_s] = _value
            end
          end
          
        end
        
        return _hash
        
      end
      
    # end private methods
  
  end
    
end

