# Include hook code here
require 'jactiverecord'
require 'helpers/inline_javascript'

ActionView::Base.send(:include, JActiveRecord::Helpers::InlineJavascript)
ActiveRecord::Base.send(:extend, JActiveRecord::ActMethods)