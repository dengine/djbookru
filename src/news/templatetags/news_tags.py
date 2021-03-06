# -*- coding: utf-8 -*-

from django import template
from django.conf import settings

from .. import models

register = template.Library()

NEWS_ON_PAGE = getattr(settings, 'NEWS_ON_PAGE', 1)


@register.inclusion_tag('news/_last_news.html')
def last_news():
    return {
        'news': models.News.objects.approved()[:NEWS_ON_PAGE]
    }
