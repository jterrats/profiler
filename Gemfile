# frozen_string_literal: true

source "https://rubygems.org"

# Use github-pages gem for compatibility with GitHub Pages
gem "github-pages", "~> 232", group: :jekyll_plugins

# Theme (already included in github-pages but specified for clarity)
gem "jekyll-theme-cayman"

# Windows and JRuby does not include zoneinfo files, so bundle the tzinfo-data gem
# and associated library.
platforms :mingw, :x64_mingw, :mswin, :jruby do
  gem "tzinfo", ">= 1", "< 3"
  gem "tzinfo-data"
end

# Performance-booster for watching directories on Windows
gem "wdm", "~> 0.1", :platforms => [:mingw, :x64_mingw, :mswin]

# Lock `http_parser.rb` gem to `v0.6.x` on JRuby builds since newer versions of the gem
# do not have a Java counterpart.
gem "http_parser.rb", "~> 0.6.0", :platforms => [:jruby]

# Note: Using github-pages gem ensures compatibility with GitHub Pages
# deployment environment and includes all required Jekyll plugins

