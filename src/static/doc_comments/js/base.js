jQuery.noConflict();

(function($){
    jQuery(function($){
        var $elements = $('.section > p, div[class*=highlight], '+
                ' .section dd, .section ul li, .section ol li, .section > .admonition')
            .not('.admonition-title, #s-django-documentation p, #s-django-documentation ul li,'+
                ' .admonition div[class*=highlight], dl div[class*=highlight], .admonition *, td li');
        var comments = new Comments($elements);
    });

    function Comments($elements){
        var self = this;
        this.isAuthenticated = false;
        this.page = window.location.pathname;
        this.xpath = '';
        this.urls = {
            add: '/doc_comments/add/',
            getLoginStatus: '/doc_comments/get_login_status/',
            login: '/auth/login/?next='+this.page,
            loadCommentsInfo: '/doc_comments/load_comments_info/',
            loadComments: '/doc_comments/load_comments/'
        };
        this.$elements = $elements;

        this._init = function(){
            //add comment form
            $('body').append(
                '<div class="modal hide" id="commentsModal">'+
                  '<div class="modal-header">'+
                    '<button type="button" class="close" data-dismiss="modal">×</button>'+
                    '<h3>Комментарии</h3>'+
                  '</div>'+
                  '<div class="modal-body">'+
                    '<ul class="nav nav-tabs">'+
                      '<li class="active"><a href="#commentsModalAdd" data-toggle="tab">Добавить</a></li>'+
                      '<li><a href="#commentsModalComments" data-toggle="tab">Комментарии блока</a></li>'+
                    '</ul>'+
                    '<div class="tab-content">'+
                      '<div class="tab-pane active" id="commentsModalAdd">'+
                        '<form class="form-inline" method="post" action="'+this.urls.add+'">'+
                          '<input type="hidden" name="page">'+
                          '<input type="hidden" name="xpath">'+
                          '<fieldset>'+
                            '<div class="control-group">'+
                              '<div class="controls">'+
                                '<textarea name="content"></textarea>'+
                              '</div>'+
                            '</div>'+
                          '</fieldset>'+
                        '</form>'+
                      '</div>'+
                      '<div class="tab-pane" id="commentsModalComments"></div>'+
                    '</div>'+
                  '</div>'+
                  '<div class="modal-footer">'+
                    '<a href="#" class="btn" data-dismiss="modal">Отмена</a>'+
                    '<a href="#" class="btn submit btn-primary">Добавить</a>'+
                  '</div>'+
                '</div>');

            this.$modal = $('#commentsModal');
            this.$form = $('#commentsModalAdd form');

            this.$modal.find('.submit').click(function(){
                if ( ! self.isAuthenticated){
                    return false;
                }
                var $textarea = self.$form.find('textarea');
                self.cleanFormMessages();

                if ( ! jQuery.trim($textarea.val())){
                    self.showFormError('Добавьте комментарий');
                }else{
                    self.$form.ajaxSubmit({
                        dataType: 'json',
                        success: function(resp){
                            if (resp.error){
                                self.showFormError(resp.error);
                            }else{
                                self.showFormSuccess('Спасибо за комментарий');
                                self.$form.clearForm();
                                self.loadCommentsInfo();
                                self.loadComments();
                            }
                        }
                    });
                }
                return false;
            });

            //check login status
            jQuery.post(this.urls.getLoginStatus, function(resp){
                self.isAuthenticated = resp.isAuthenticated;
                self.checkLogin();
            });

            //add comment idicator
            this.$elements.each(function(){
                var $this = $(this);
                var $indicator = $('<div class="comment-indicator"><span></span></div>');
                $indicator.css('height', $this.outerHeight());
                $this.addClass('block-with-comment');
                $this.prepend($indicator);
            });

            $('.comment-indicator').click(function(){
                var xpath = self.getElementXPath($(this).parent()[0]);
                self.xpath = xpath;

                self.$form.find('input[name=xpath]').val(xpath);
                self.$form.find('input[name=page]').val(self.page);

                self.cleanFormMessages();
                self.checkLogin();
                self.loadComments();
                $('#commentsModal a[href="#commentsModalAdd"]').tab('show');
                self.$modal.modal();
                return false;
            });

            this.loadCommentsInfo();
        };

        this.loadComments = function(){
            jQuery.post(this.urls.loadComments, {
                'page': this.page,
                'xpath': this.xpath
            }, function(resp){
                var $container = $('#commentsModalComments');
                $container.html('');
                for (var i=0, len=resp.data.length; i<len; i++){
                    var obj = resp.data[i];
                    $container.append(
                        '<div class="comment">'+
                            '<a class="thumbnail" href="'+obj.author_url+'"><img src="'+obj.avatar+'"></a>'+
                            '<a href="'+obj.author_url+'">'+obj.author+'</a> | '+
                            '<span class="created">'+obj.created+'</span><br>'+
                            '<p>'+obj.content+'</p>'+
                            '<div style="clear: both"></div>'+
                        '</div>'+
                        '');
                }
            });
        };

        this.loadCommentsInfo = function(){
            jQuery.post(this.urls.loadCommentsInfo, {
                'page': this.page
            }, function(resp){
                for (var i=0, len=resp.data.length; i<len; i++){
                    var el = self.getElementsByXPath(window.document, resp.data[i].xpath)[0];
                    if(el){
                        self.updateCommentsCount(el, resp.data[i].count);
                    }
                }
            });
        };

        this.updateCommentsCount = function(el, count){
            var $indicator = $(el).find('.comment-indicator');
            if (count){
                $indicator.addClass('has-comments').find('span').text(count);
            }else{
                $indicator.removeClass('has-comments').find('span').text('');
            }

        };

        this.checkLogin = function(){
            if ( ! self.isAuthenticated){
                self.showFormError('Вы не авторизированы и не сможете добавить комментарий.'+
                    ' <a href="'+self.urls.login+'">Войти</a>');
            }
        };

        this.cleanFormMessages = function(){
            var $textarea = this.$form.find('textarea');
            $textarea.parents('.control-group').removeClass('error').removeClass('success');
            $textarea.parents('.control-group').find('.help-inline').remove();
        };

        this.showFormSuccess = function(msg){
            $('#commentsModal a[href="#commentsModalAdd"]').tab('show');
            var $textarea = this.$form.find('textarea');
            $textarea.parents('.control-group').addClass('success')
                .append('<div class="help-inline">'+msg+'</div>');
        };

        this.showFormError = function(msg){
            $('#commentsModal a[href="#commentsModalAdd"]').tab('show');
            var $textarea = this.$form.find('textarea');
            $textarea.parents('.control-group').addClass('error')
                .append('<div class="help-inline">'+msg+'</div>');
        };

        this.getElementXPath = function(element)
        {
            if (element && element.id)
                return '//*[@id="' + element.id + '"]';
            else
                return this.getElementTreeXPath(element);
        };

        this.getElementTreeXPath = function(element)
        {
            var paths = [];

            // Use nodeName (instead of localName) so namespace prefix is included (if any).
            for (; element && element.nodeType == 1; element = element.parentNode)
            {
                var index = 0;
                for (var sibling = element.previousSibling; sibling; sibling = sibling.previousSibling)
                {
                    // Ignore document type declaration.
                    if (sibling.nodeType == Node.DOCUMENT_TYPE_NODE)
                        continue;

                    if (sibling.nodeName == element.nodeName)
                        ++index;
                }

                var tagName = element.nodeName.toLowerCase();
                var pathIndex = (index ? "[" + (index+1) + "]" : "");
                paths.splice(0, 0, tagName + pathIndex);
            }

            return paths.length ? "/" + paths.join("/") : null;
        };

        this.getElementsByXPath = function(doc, xpath)
        {
            var nodes = [];

            try {
                var result = doc.evaluate(xpath, doc, null, XPathResult.ANY_TYPE, null);
                for (var item = result.iterateNext(); item; item = result.iterateNext())
                    nodes.push(item);
            }
            catch (exc)
            {
                // Invalid xpath expressions make their way here sometimes.  If that happens,
                // we still want to return an empty set without an exception.
            }

            return nodes;
        };

        this._init();
    }
})(jQuery);
