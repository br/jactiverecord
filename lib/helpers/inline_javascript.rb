module JActiveRecord

  module Helpers

    module InlineJavascript
      
      # Calling yield_inline_javascript retrieves the stored content from <tt>inline_javascript</tt>.
      def yield_inline_javascript
        output = ""
        output += instance_variable_get("@content_for_jactiverecord_layout").to_s
        output += instance_variable_get("@content_for_jactiverecord_view").to_s
        output += instance_variable_get("@content_for_jactiverecord_partial").to_s
        output = output.gsub(/<body\/?[^>]*>/, "").gsub(/<\/body\/?[^>]*>/, "")
        output = '<script type="text/javascript">' + output + "</script>"
        return output
      end
      
      # Calling inline_javascript stores a block of javascript.
      # You can access the stored content at the bottom of your layout with <tt>yield_inline_javascript</tt>.
      #
      # ==== Examples
      #
      #   <% inline_javascript do %>
      #     <script type="text/javascript">
      #       Namespace.currentUser = <% current_user.to_json %>;
      #     </script>
      #   <% end %>
      #
      # The script tags are optional and will be added at the end.
      #
      # You can then use <tt>yield_inline_javascript</tt> anywhere in your templates, preferably at the end 
      #
      #   <%= yield :not_authorized if current_user.nil? %>
      def inline_javascript(options, content = nil, &block)
        
        # get the 'depth'/caller
        current_caller = caller[0].split(":")[2].split("in `")[1][0..-2]
        
        # converts layout_list to the "_run_erb_" method format
        layouts = ActionController::Base.layout_list.collect { |layout| "_run_erb_" + layout.gsub(RAILS_ROOT,"").gsub("/","47").gsub(".","46") }
        
        if layouts.include?(current_caller)
          # layout: _run_erb_47app47views47layouts47application46html46erb
          name = "layout"    
        elsif current_caller.split("47").last[0] == 95
          # partial: _run_erb_47app47views47sections47_community_members46html46erb
          name = "partial"
        else
          # view: _run_erb_47app47views47sections47show46html46erb
          name = "view"
        end
        
        content_name = ("jactiverecord_" + name).to_sym
        content_for(content_name, &block)
        
      end

    end
  end
end
